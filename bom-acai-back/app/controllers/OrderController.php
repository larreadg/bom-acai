<?php

declare(strict_types=1);

class OrderController
{
    private OrderService $service;

    public function __construct()
    {
        $this->service = new OrderService();
    }

    public function index(): void
    {
        $query    = Flight::request()->query;
        $filters  = [];
        $dateFrom = trim((string) ($query['date_from'] ?? ''));
        $dateTo   = trim((string) ($query['date_to'] ?? ''));
        $status   = trim((string) ($query['status'] ?? ''));

        if ($dateFrom !== '') $filters['date_from'] = $dateFrom;
        if ($dateTo   !== '') $filters['date_to']   = $dateTo;
        if ($status   !== '') $filters['status']    = $status;

        ApiResponse::success('Orders retrieved', $this->service->list($filters))->send();
    }

    public function cancel(int $id): void
    {
        $order = $this->service->getById($id);

        if ($order === false) {
            ApiResponse::error('Order not found', 404)->send();
            return;
        }

        if ($order['status'] === 'cancelled') {
            ApiResponse::error('Order is already cancelled', 422)->send();
            return;
        }

        if (!$this->service->cancel($id)) {
            ApiResponse::error('Could not cancel order', 500)->send();
            return;
        }

        ApiResponse::success('Order cancelled', $this->service->getById($id))->send();
    }

    public function store(): void
    {
        $body = Flight::request()->data->getData();
        $items = $body['items'] ?? null;

        if (!is_array($items) || $items === []) {
            ApiResponse::error('items is required and must contain at least one item', 400)->send();
            return;
        }

        $notes = trim((string) ($body['notes'] ?? ''));
        $normalizedItems = [];

        foreach ($items as $index => $item) {
            if (!is_array($item)) {
                ApiResponse::error('Each item must be an object', 400)->send();
                return;
            }

            $itemNumber = $index + 1;
            $presentationId = $item['product_presentation_id'] ?? null;

            if (!$this->isPositiveInteger($presentationId)) {
                ApiResponse::error("items.{$index}.product_presentation_id must be a positive integer", 400)->send();
                return;
            }

            $quantity = $item['quantity'] ?? 1;

            if (!$this->isPositiveInteger($quantity)) {
                ApiResponse::error("items.{$index}.quantity must be a positive integer", 400)->send();
                return;
            }

            $presentation = $this->service->getActivePresentationById((int) $presentationId);

            if ($presentation === false) {
                ApiResponse::error("Presentation not found or inactive for item {$itemNumber}", 404)->send();
                return;
            }

            $extraIds = $this->normalizeExtraIds($item['extras'] ?? [], $index);

            if ($extraIds === false) {
                return;
            }

            $extras = $this->service->getActiveExtrasByIds($extraIds);
            $missingExtraIds = array_values(array_diff($extraIds, array_keys($extras)));

            if ($missingExtraIds !== []) {
                ApiResponse::error(
                    'Extra not found or inactive for item ' . $itemNumber . ': ' . implode(', ', $missingExtraIds),
                    404
                )->send();
                return;
            }

            $itemNotes = trim((string) ($item['notes'] ?? ''));
            $normalizedExtras = [];

            foreach ($extraIds as $extraId) {
                $extra = $extras[$extraId];
                $normalizedExtras[] = [
                    'unit_cost'  => (float) $extra['cost_price'],
                    'extra_id'   => (int) $extra['id'],
                    'unit_price' => (float) $extra['sale_price'],
                ];
            }

            $normalizedItems[] = [
                'product_presentation_id' => (int) $presentationId,
                'quantity'                => (int) $quantity,
                'unit_cost'               => (float) $presentation['cost_price'],
                'unit_price'              => (float) $presentation['sale_price'],
                'notes'                   => $itemNotes !== '' ? $itemNotes : null,
                'extras'                  => $normalizedExtras,
            ];
        }

        $orderId = $this->service->create([
            'notes' => $notes !== '' ? $notes : null,
            'items' => $normalizedItems,
        ]);

        if ($orderId === false) {
            ApiResponse::error('Could not create order', 500)->send();
            return;
        }

        ApiResponse::success('Order created', $this->service->getById($orderId), 201)->send();
    }

    private function normalizeExtraIds(mixed $extras, int $itemIndex): array|false
    {
        if (!is_array($extras)) {
            ApiResponse::error("items.{$itemIndex}.extras must be an array", 400)->send();
            return false;
        }

        $normalized = [];

        foreach ($extras as $extraIndex => $extra) {
            $extraId = is_array($extra) ? ($extra['extra_id'] ?? null) : $extra;

            if (!$this->isPositiveInteger($extraId)) {
                ApiResponse::error(
                    "items.{$itemIndex}.extras.{$extraIndex} must be a positive integer or an object with extra_id",
                    400
                )->send();
                return false;
            }

            $extraId = (int) $extraId;

            if (in_array($extraId, $normalized, true)) {
                ApiResponse::error("items.{$itemIndex}.extras contains duplicated extra_id {$extraId}", 400)->send();
                return false;
            }

            $normalized[] = $extraId;
        }

        return $normalized;
    }

    private function isPositiveInteger(mixed $value): bool
    {
        if (is_int($value)) {
            return $value > 0;
        }

        if (is_string($value) && preg_match('/^[1-9]\d*$/', $value) === 1) {
            return true;
        }

        return false;
    }
}

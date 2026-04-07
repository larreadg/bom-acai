<?php

declare(strict_types=1);

class ProductPresentationController
{
    private ProductPresentationService $service;

    public function __construct()
    {
        $this->service = new ProductPresentationService();
    }

    public function index(): void
    {
        ApiResponse::success('OK', $this->service->getAll())->send();
    }

    public function byProduct(int $productId): void
    {
        ApiResponse::success('OK', $this->service->getByProduct($productId))->send();
    }

    public function show(int $id): void
    {
        $presentation = $this->service->getById($id);

        if ($presentation === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        ApiResponse::success('OK', $presentation)->send();
    }

    public function store(): void
    {
        $body      = Flight::request()->data->getData();
        $name      = trim($body['name'] ?? '');
        $productId = $body['product_id'] ?? null;
        $price     = $body['price']      ?? null;

        if ($name === '' || $productId === null || $price === null) {
            ApiResponse::error('name, product_id and price are required', 400)->send();
            return;
        }

        $id = $this->service->create($body);

        if ($id === false) {
            ApiResponse::error('Could not create presentation', 500)->send();
            return;
        }

        ApiResponse::success('Presentation created', $this->service->getById($id), 201)->send();
    }

    public function update(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        $body = Flight::request()->data->getData();
        $ok   = $this->service->update($id, $body);

        if (!$ok) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        ApiResponse::success('Presentation updated', $this->service->getById($id))->send();
    }

    public function destroy(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        $this->service->delete($id);
        ApiResponse::success('Presentation deactivated')->send();
    }
}

<?php

declare(strict_types=1);

class OrderService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function getActivePresentationById(int $id): array|false
    {
        $stmt = $this->db->prepare(
            'SELECT pp.*, p."name" AS "product_name"
             FROM "product_presentations" pp
             JOIN "products" p ON p."id" = pp."product_id"
             WHERE pp."id" = ? AND pp."active" = 1 AND p."active" = 1
             LIMIT 1'
        );
        $stmt->execute([$id]);

        return $stmt->fetch();
    }

    public function getActiveExtrasByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            'SELECT * FROM "extras"
             WHERE "id" IN (' . $placeholders . ') AND "active" = 1'
        );
        $stmt->execute($ids);

        $extras = [];

        foreach ($stmt->fetchAll() as $extra) {
            $extras[(int) $extra['id']] = $extra;
        }

        return $extras;
    }

    public function create(array $data): int|false
    {
        try {
            $this->db->beginTransaction();

            $tz = new \DateTimeZone('America/Argentina/Buenos_Aires');
            $now = (new \DateTime('now', $tz))->format('Y-m-d H:i:s');

            $stmt = $this->db->prepare(
                'INSERT INTO "orders" ("status", "total", "notes", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?)'
            );

            $stmt->execute([
                'pending',
                0,
                $data['notes'] ?? null,
                $now,
                $now,
            ]);

            $orderId = (int) $this->db->lastInsertId();
            $total = 0.0;

            $itemStmt = $this->db->prepare(
                'INSERT INTO "order_items"
                    ("order_id", "product_presentation_id", "quantity", "unit_price", "subtotal", "notes")
                 VALUES (?, ?, ?, ?, ?, ?)'
            );

            $extraStmt = $this->db->prepare(
                'INSERT INTO "order_item_extras" ("order_item_id", "extra_id", "unit_price")
                 VALUES (?, ?, ?)'
            );

            foreach ($data['items'] as $item) {
                $extrasUnitTotal = 0.0;

                foreach ($item['extras'] as $extra) {
                    $extrasUnitTotal += (float) $extra['unit_price'];
                }

                $subtotal = round(
                    ((float) $item['unit_price'] + $extrasUnitTotal) * (int) $item['quantity'],
                    2
                );

                $itemStmt->execute([
                    $orderId,
                    $item['product_presentation_id'],
                    $item['quantity'],
                    $item['unit_price'],
                    $subtotal,
                    $item['notes'] ?? null,
                ]);

                $orderItemId = (int) $this->db->lastInsertId();

                foreach ($item['extras'] as $extra) {
                    $extraStmt->execute([
                        $orderItemId,
                        $extra['extra_id'],
                        $extra['unit_price'],
                    ]);
                }

                $total += $subtotal;
            }

            $updateStmt = $this->db->prepare(
                'UPDATE "orders"
                 SET "total" = ?, "updated_at" = ?
                 WHERE "id" = ?'
            );
            $updateStmt->execute([round($total, 2), $now, $orderId]);

            $this->db->commit();

            return $orderId;
        } catch (\Throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            return false;
        }
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare('SELECT * FROM "orders" WHERE "id" = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();

        if ($order === false) {
            return false;
        }

        $itemsStmt = $this->db->prepare(
            'SELECT
                oi.*,
                pp."name" AS "presentation_name",
                pp."product_id",
                p."name" AS "product_name"
             FROM "order_items" oi
             JOIN "product_presentations" pp ON pp."id" = oi."product_presentation_id"
             JOIN "products" p ON p."id" = pp."product_id"
             WHERE oi."order_id" = ?
             ORDER BY oi."id" ASC'
        );
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll();

        $extrasStmt = $this->db->prepare(
            'SELECT
                oie.*,
                e."name" AS "extra_name"
             FROM "order_item_extras" oie
             JOIN "order_items" oi ON oi."id" = oie."order_item_id"
             JOIN "extras" e ON e."id" = oie."extra_id"
             WHERE oi."order_id" = ?
             ORDER BY oie."id" ASC'
        );
        $extrasStmt->execute([$id]);

        $extrasByItem = [];

        foreach ($extrasStmt->fetchAll() as $extra) {
            $orderItemId = (int) $extra['order_item_id'];
            $extrasByItem[$orderItemId][] = $extra;
        }

        foreach ($items as &$item) {
            $item['extras'] = $extrasByItem[(int) $item['id']] ?? [];
        }
        unset($item);

        $order['items'] = $items;

        return $order;
    }
}

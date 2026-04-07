<?php

declare(strict_types=1);

class ProductPresentationService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function getAll(): array
    {
        return $this->db->query(
            'SELECT pp.*, p."name" AS "product_name"
             FROM "product_presentations" pp
             JOIN "products" p ON p."id" = pp."product_id"
             ORDER BY p."name" ASC, pp."price" ASC'
        )->fetchAll();
    }

    public function getByProduct(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM "product_presentations"
             WHERE "product_id" = ? AND "active" = 1
             ORDER BY "price" ASC'
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare(
            'SELECT pp.*, p."name" AS "product_name"
             FROM "product_presentations" pp
             JOIN "products" p ON p."id" = pp."product_id"
             WHERE pp."id" = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function existsByNameAndProduct(string $name, int $productId, ?int $excludeId = null): bool
    {
        $sql    = 'SELECT 1 FROM "product_presentations"
                   WHERE LOWER("name") = LOWER(?) AND "product_id" = ?';
        $values = [$name, $productId];

        if ($excludeId !== null) {
            $sql    .= ' AND "id" <> ?';
            $values[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql . ' LIMIT 1');
        $stmt->execute($values);

        return $stmt->fetchColumn() !== false;
    }

    public function productExists(int $productId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM "products" WHERE "id" = ? LIMIT 1');
        $stmt->execute([$productId]);
        return $stmt->fetchColumn() !== false;
    }

    public function create(array $data): int|false
    {
        $stmt = $this->db->prepare(
            'INSERT INTO "product_presentations"
                ("product_id", "name", "price", "image_url", "image_path", "active")
             VALUES (?, ?, ?, ?, ?, ?)'
        );

        $ok = $stmt->execute([
            $data['product_id'],
            $data['name'],
            $data['price'],
            $data['image_url']  ?? null,
            $data['image_path'] ?? null,
            $data['active']     ?? 1,
        ]);

        return $ok ? (int) $this->db->lastInsertId() : false;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $values = [];

        if (isset($data['product_id']))              { $fields[] = '"product_id" = ?';   $values[] = $data['product_id']; }
        if (isset($data['name']))                    { $fields[] = '"name" = ?';          $values[] = $data['name']; }
        if (isset($data['price']))                   { $fields[] = '"price" = ?';         $values[] = $data['price']; }
        if (array_key_exists('image_url', $data))   { $fields[] = '"image_url" = ?';     $values[] = $data['image_url']; }
        if (array_key_exists('image_path', $data))  { $fields[] = '"image_path" = ?';    $values[] = $data['image_path']; }
        if (isset($data['active']))                  { $fields[] = '"active" = ?';        $values[] = $data['active']; }

        if (empty($fields)) {
            return false;
        }

        $values[] = $id;

        $stmt = $this->db->prepare(
            'UPDATE "product_presentations" SET ' . implode(', ', $fields) . ' WHERE "id" = ?'
        );

        return $stmt->execute($values) && $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE "product_presentations" SET "active" = 0 WHERE "id" = ?');
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }
}

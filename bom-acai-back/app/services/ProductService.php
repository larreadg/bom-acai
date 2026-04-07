<?php

declare(strict_types=1);

class ProductService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function getAll(): array
    {
        return $this->db->query(
            'SELECT p.*, c."name" AS "category_name"
             FROM "products" p
             JOIN "categories" c ON c."id" = p."category_id"
             ORDER BY c."name" ASC, p."name" ASC'
        )->fetchAll();
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare(
            'SELECT p.*, c."name" AS "category_name"
             FROM "products" p
             JOIN "categories" c ON c."id" = p."category_id"
             WHERE p."id" = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if ($product === false) {
            return false;
        }

        // Include presentations
        $stmt = $this->db->prepare(
            'SELECT * FROM "product_presentations"
             WHERE "product_id" = ? AND "active" = 1
             ORDER BY "price" ASC'
        );
        $stmt->execute([$id]);
        $product['presentations'] = $stmt->fetchAll();

        return $product;
    }

    public function create(array $data): int|false
    {
        $stmt = $this->db->prepare(
            'INSERT INTO "products" ("category_id", "name", "description", "active") VALUES (?, ?, ?, ?)'
        );

        $ok = $stmt->execute([
            $data['category_id'],
            $data['name'],
            $data['description'] ?? null,
            $data['active']      ?? 1,
        ]);

        return $ok ? (int) $this->db->lastInsertId() : false;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $values = [];

        if (isset($data['category_id']))                    { $fields[] = '"category_id" = ?';  $values[] = $data['category_id']; }
        if (isset($data['name']))                           { $fields[] = '"name" = ?';          $values[] = $data['name']; }
        if (array_key_exists('description', $data))        { $fields[] = '"description" = ?';   $values[] = $data['description']; }
        if (isset($data['active']))                         { $fields[] = '"active" = ?';        $values[] = $data['active']; }

        if (empty($fields)) {
            return false;
        }

        $values[] = $id;

        $stmt = $this->db->prepare(
            'UPDATE "products" SET ' . implode(', ', $fields) . ' WHERE "id" = ?'
        );

        return $stmt->execute($values) && $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE "products" SET "active" = 0 WHERE "id" = ?');
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }
}

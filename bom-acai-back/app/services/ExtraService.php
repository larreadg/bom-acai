<?php

declare(strict_types=1);

class ExtraService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function getAll(): array
    {
        return $this->db
            ->query('SELECT * FROM "extras" ORDER BY "name" ASC')
            ->fetchAll();
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare('SELECT * FROM "extras" WHERE "id" = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function existsByName(string $name, ?int $excludeId = null): bool
    {
        $sql    = 'SELECT 1 FROM "extras" WHERE LOWER("name") = LOWER(?)';
        $values = [$name];

        if ($excludeId !== null) {
            $sql    .= ' AND "id" <> ?';
            $values[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql . ' LIMIT 1');
        $stmt->execute($values);

        return $stmt->fetchColumn() !== false;
    }

    public function create(array $data): int|false
    {
        $stmt = $this->db->prepare(
            'INSERT INTO "extras" ("name", "cost_price", "sale_price", "active") VALUES (?, ?, ?, ?)'
        );

        $ok = $stmt->execute([
            $data['name'],
            $data['cost_price'],
            $data['sale_price'],
            $data['active'] ?? 1,
        ]);

        return $ok ? (int) $this->db->lastInsertId() : false;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $values = [];

        if (isset($data['name']))       { $fields[] = '"name" = ?';        $values[] = $data['name']; }
        if (isset($data['cost_price'])) { $fields[] = '"cost_price" = ?';  $values[] = $data['cost_price']; }
        if (isset($data['sale_price'])) { $fields[] = '"sale_price" = ?';  $values[] = $data['sale_price']; }
        if (isset($data['active']))     { $fields[] = '"active" = ?';      $values[] = $data['active']; }

        if (empty($fields)) {
            return false;
        }

        $values[] = $id;

        $stmt = $this->db->prepare(
            'UPDATE "extras" SET ' . implode(', ', $fields) . ' WHERE "id" = ?'
        );

        return $stmt->execute($values) && $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE "extras" SET "active" = 0 WHERE "id" = ?');
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }
}

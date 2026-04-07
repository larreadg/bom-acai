<?php

declare(strict_types=1);

class CategoryService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function getAll(): array
    {
        return $this->db
            ->query('SELECT * FROM "categories" ORDER BY "name" ASC')
            ->fetchAll();
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare('SELECT * FROM "categories" WHERE "id" = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function existsByName(string $name, ?int $excludeId = null): bool
    {
        $sql = 'SELECT 1 FROM "categories" WHERE LOWER("name") = LOWER(?)';
        $values = [$name];

        if ($excludeId !== null) {
            $sql .= ' AND "id" <> ?';
            $values[] = $excludeId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        return $stmt->fetchColumn() !== false;
    }

    public function create(array $data): int|false
    {
        $stmt = $this->db->prepare(
            'INSERT INTO "categories" ("name", "description", "active") VALUES (?, ?, ?)'
        );

        $ok = $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            $data['active']      ?? 1,
        ]);

        return $ok ? (int) $this->db->lastInsertId() : false;
    }

    public function update(int $id, array $data): bool
    {
        $fields  = [];
        $values  = [];

        if (isset($data['name']))        { $fields[] = '"name" = ?';        $values[] = $data['name']; }
        if (array_key_exists('description', $data)) { $fields[] = '"description" = ?'; $values[] = $data['description']; }
        if (isset($data['active']))      { $fields[] = '"active" = ?';      $values[] = $data['active']; }

        if (empty($fields)) {
            return false;
        }

        $values[] = $id;

        $stmt = $this->db->prepare(
            'UPDATE "categories" SET ' . implode(', ', $fields) . ' WHERE "id" = ?'
        );

        return $stmt->execute($values) && $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE "categories" SET "active" = 0 WHERE "id" = ?');
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }
}

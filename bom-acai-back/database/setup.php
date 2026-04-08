<?php

declare(strict_types=1);

/**
 * Seed default user.
 * Usage: php database/setup.php
 */

$dbPath = __DIR__ . '/../bom_acai.db';

$pdo = new PDO('sqlite:' . $dbPath, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$usersTableExists = (bool) $pdo
    ->query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    ->fetchColumn();

if (!$usersTableExists) {
    throw new RuntimeException('Table "users" does not exist. Apply database/schema.sql first.');
}

$stmt = $pdo->prepare(
    'INSERT OR IGNORE INTO "users" ("username", "password_hash") VALUES (?, ?)'
);

$stmt->execute([
    '',
    password_hash('', PASSWORD_DEFAULT),
]);

if ($stmt->rowCount() > 0) {
    echo "Default user '' created.\n";
} else {
    echo "Default user '' already exists.\n";
}

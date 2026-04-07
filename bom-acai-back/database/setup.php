<?php

/**
 * Setup script — run once from CLI or browser to initialize the database.
 * Usage: php database/setup.php
 */

declare(strict_types=1);

$dbPath = __DIR__ . '/../bom_acai.db';
$schema = __DIR__ . '/schema.sql';

$pdo = new PDO('sqlite:' . $dbPath, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// Run schema
$pdo->exec(file_get_contents($schema));
echo "Schema applied.\n";

// Seed default user (INSERT OR IGNORE — safe to run multiple times)
$stmt = $pdo->prepare('INSERT OR IGNORE INTO "users" ("username", "password_hash") VALUES (?, ?)');
$stmt->execute(['larreadg', password_hash('Diego.2026', PASSWORD_DEFAULT)]);

if ($stmt->rowCount() > 0) {
    echo "Default user 'larreadg' created.\n";
} else {
    echo "Default user 'larreadg' already exists — skipped.\n";
}

echo "Done.\n";

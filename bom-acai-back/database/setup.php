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

function hasColumn(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->query(sprintf('PRAGMA table_info("%s")', $table));

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $info) {
        if (($info['name'] ?? null) === $column) {
            return true;
        }
    }

    return false;
}

// Run schema
$pdo->exec(file_get_contents($schema));
echo "Schema applied.\n";

$addedCostPrice = false;
$addedSalePrice = false;

if (!hasColumn($pdo, 'product_presentations', 'cost_price')) {
    $pdo->exec('ALTER TABLE "product_presentations" ADD COLUMN "cost_price" REAL NOT NULL DEFAULT 0');
    $addedCostPrice = true;
    echo "Column product_presentations.cost_price added.\n";
}

if (!hasColumn($pdo, 'product_presentations', 'sale_price')) {
    $pdo->exec('ALTER TABLE "product_presentations" ADD COLUMN "sale_price" REAL NOT NULL DEFAULT 0');
    $addedSalePrice = true;
    echo "Column product_presentations.sale_price added.\n";
}

if (($addedCostPrice || $addedSalePrice) && hasColumn($pdo, 'product_presentations', 'price')) {
    if ($addedCostPrice) {
        $pdo->exec('UPDATE "product_presentations" SET "cost_price" = "price"');
    }

    if ($addedSalePrice) {
        $pdo->exec('UPDATE "product_presentations" SET "sale_price" = "price"');
    }

    echo "Existing presentation prices migrated to cost_price/sale_price.\n";
}

if (!hasColumn($pdo, 'order_items', 'unit_cost')) {
    $pdo->exec('ALTER TABLE "order_items" ADD COLUMN "unit_cost" REAL NOT NULL DEFAULT 0');
    echo "Column order_items.unit_cost added.\n";
}

// Seed default user (INSERT OR IGNORE — safe to run multiple times)
$stmt = $pdo->prepare('INSERT OR IGNORE INTO "users" ("username", "password_hash") VALUES (?, ?)');
$stmt->execute(['larreadg', password_hash('Diego.2026', PASSWORD_DEFAULT)]);

if ($stmt->rowCount() > 0) {
    echo "Default user 'larreadg' created.\n";
} else {
    echo "Default user 'larreadg' already exists — skipped.\n";
}

echo "Done.\n";

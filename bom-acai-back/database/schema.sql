-- ============================================================
-- BOM ACAÍ - Database Schema
-- ============================================================

-- Auth --------------------------------------------------------

CREATE TABLE IF NOT EXISTS "users" (
    "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
    "username"      TEXT    NOT NULL UNIQUE,
    "password_hash" TEXT    NOT NULL,
    "created_at"    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "auth_tokens" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id"     INTEGER NOT NULL,
    "token_hash"  TEXT    NOT NULL UNIQUE,
    "expires_at"  DATETIME NOT NULL,
    "created_at"  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_auth_tokens_token_hash"
    ON "auth_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "idx_auth_tokens_user_id"
    ON "auth_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "captcha_challenges" (
    "id"         INTEGER  PRIMARY KEY AUTOINCREMENT,
    "token"      TEXT     NOT NULL UNIQUE,
    "answer"     TEXT     NOT NULL,
    "ip"         TEXT     NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used"       INTEGER  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_captcha_token"
    ON "captcha_challenges" ("token");

CREATE INDEX IF NOT EXISTS "idx_captcha_ip_expires"
    ON "captcha_challenges" ("ip", "expires_at");

-- Catalogue ---------------------------------------------------

CREATE TABLE IF NOT EXISTS "categories" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "name"        TEXT    NOT NULL UNIQUE,
    "description" TEXT,
    "active"      INTEGER NOT NULL DEFAULT 1,
    "created_at"  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "products" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "name"        TEXT    NOT NULL,
    "description" TEXT,
    "active"      INTEGER NOT NULL DEFAULT 1,
    "created_at"  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
);

CREATE INDEX IF NOT EXISTS "idx_products_category_id"
    ON "products" ("category_id");

CREATE TABLE IF NOT EXISTS "product_presentations" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "product_id"  INTEGER NOT NULL,
    "name"        TEXT    NOT NULL,          -- "isopor 1/4", "vaso 300ml", "cucurucho", etc.
    "cost_price"  REAL    NOT NULL DEFAULT 0,
    "sale_price"  REAL    NOT NULL,
    "image_url"   TEXT,                      -- URL pública (CDN / storage externo)
    "image_path"  TEXT,                      -- Path relativo al servidor: /uploads/presentations/xxx.jpg
    "active"      INTEGER NOT NULL DEFAULT 1,
    "created_at"  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
);

CREATE INDEX IF NOT EXISTS "idx_product_presentations_product_id"
    ON "product_presentations" ("product_id");

CREATE TABLE IF NOT EXISTS "extras" (
    "id"         INTEGER PRIMARY KEY AUTOINCREMENT,
    "name"       TEXT NOT NULL UNIQUE,       -- "Leche en polvo", "Chocolate", "Kiwi", etc.
    "cost_price" REAL NOT NULL DEFAULT 0,
    "sale_price" REAL NOT NULL,
    "active"     INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders ------------------------------------------------------

CREATE TABLE IF NOT EXISTS "orders" (
    "id"         INTEGER PRIMARY KEY AUTOINCREMENT,
    "status"     TEXT    NOT NULL DEFAULT 'pending', -- pending | preparing | ready | delivered | cancelled
    "total"      REAL    NOT NULL DEFAULT 0,
    "notes"      TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id"                      INTEGER PRIMARY KEY AUTOINCREMENT,
    "order_id"                INTEGER NOT NULL,
    "product_presentation_id" INTEGER NOT NULL,
    "quantity"                INTEGER NOT NULL DEFAULT 1,
    "unit_cost"               REAL    NOT NULL DEFAULT 0, -- costo al momento del pedido
    "unit_price"              REAL    NOT NULL,   -- precio al momento del pedido
    "subtotal"                REAL    NOT NULL,
    "notes"                   TEXT,
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    FOREIGN KEY ("product_presentation_id") REFERENCES "product_presentations"("id")
);

CREATE INDEX IF NOT EXISTS "idx_order_items_order_id"
    ON "order_items" ("order_id");

CREATE TABLE IF NOT EXISTS "order_item_extras" (
    "id"             INTEGER PRIMARY KEY AUTOINCREMENT,
    "order_item_id"  INTEGER NOT NULL,
    "extra_id"       INTEGER NOT NULL,
    "unit_cost"      REAL    NOT NULL DEFAULT 0, -- costo al momento del pedido
    "unit_price"     REAL    NOT NULL,            -- precio al momento del pedido
    FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE,
    FOREIGN KEY ("extra_id")      REFERENCES "extras"("id")
);

CREATE INDEX IF NOT EXISTS "idx_order_item_extras_order_item_id"
    ON "order_item_extras" ("order_item_id");

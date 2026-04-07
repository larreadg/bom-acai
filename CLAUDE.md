# Bom Acaí — Project Context for Claude

## What is this project
POS (point of sale) REST API for an ice cream shop called **Bom Acaí**.
Used at the cash register to take customer orders. No inventory management.

## Stack
- **PHP 8.2** (Windows, no Composer)
- **FlightPHP v3** — micro-framework (files in `flight/`)
- **SQLite** — database file at `bom-acai-back/bom_acai.db`
- **Timezone** — `America/Argentina/Buenos_Aires` (UTC-3 fixed, used by Paraguay)

## Project structure
```
bom-acai-back/
├── index.php                        ← entry point (loads everything)
├── .htaccess                        ← Apache rewrite rules + Authorization header fix
├── database/
│   ├── schema.sql                   ← full DDL (auth + catalogue + orders)
│   └── setup.php                    ← run once: creates tables + seeds default user
├── app/
│   ├── core/
│   │   └── ApiResponse.php          ← standard JSON response class
│   ├── config/
│   │   └── Database.php             ← PDO singleton
│   ├── middleware/
│   │   └── AuthMiddleware.php       ← Bearer token validation
│   ├── services/                    ← business logic / DB queries
│   ├── controllers/                 ← HTTP layer, calls services
│   └── routes/                      ← route definitions (loaded inside Flight::group)
└── flight/                          ← FlightPHP framework (do not modify)
```

## Architecture pattern
MVC: **routes → controllers → services**
- Routes live in `app/routes/`, registered inside `Flight::group('/api', ..., [new AuthMiddleware()])` in `index.php`
- Controllers handle HTTP (parse body, validate required fields, call service, send response)
- Services handle DB queries only — no HTTP logic
- `Database::connection()` returns a PDO singleton

## Authentication
- `POST /auth/login` — public, returns Bearer token (24h expiry)
- All `/api/*` routes require `Authorization: Bearer <token>` header
- Tokens stored hashed (`sha256`) in `auth_tokens` table
- Passwords hashed with `password_hash()` (bcrypt)
- Default user: `larreadg` / `Diego.2026` (created by `setup.php`)

## Standard JSON response
All responses use `ApiResponse`:
```php
ApiResponse::success('message', $data, 201)->send();
ApiResponse::error('message', 404)->send();
```
Response shape:
```json
{ "code": 200, "status": "success", "message": "...", "data": { ... } }
```

## Database schema summary
| Table | Purpose |
|---|---|
| `users` | API users |
| `auth_tokens` | Bearer tokens |
| `categories` | Product categories (Helados, Acaí, Bebidas, Otros) |
| `products` | Products linked to a category |
| `product_presentations` | Sizes/variants with price and image fields (`image_url`, `image_path`) |
| `extras` | Toppings/add-ons (e.g. leche en polvo, chocolate) |
| `orders` | Orders — status: `pending \| preparing \| ready \| delivered \| cancelled` |
| `order_items` | Lines of an order (references `product_presentations`) |
| `order_item_extras` | Extras added to an order item |

Prices are captured at order time (`unit_price`) so historical orders are not affected by price changes.
Deletes are **soft** (`active = 0`) for catalogue entities.

## Existing endpoints
| Method | Path | Controller |
|---|---|---|
| POST | `/auth/login` | AuthController::login |
| GET/POST/PUT/DELETE | `/api/categories[/:id]` | CategoryController |
| GET/POST/PUT/DELETE | `/api/products[/:id]` | ProductController |
| GET | `/api/products/:id/presentations` | ProductPresentationController::byProduct |
| GET/POST/PUT/DELETE | `/api/presentations[/:id]` | ProductPresentationController |
| GET/POST/PUT/DELETE | `/api/extras[/:id]` | ExtraController |

## Adding a new resource
1. Create `app/services/XService.php`
2. Create `app/controllers/XController.php`
3. Create `app/routes/x.php`
4. Register service + controller in `index.php`
5. Add route file inside `Flight::group('/api', ...)` in `index.php`

## Notes
- Run `php database/setup.php` once to initialize DB and seed default user
- Postman collection: `bom-acai.postman_collection.json` (set `base_url` variable)
- `bom_acai.db` is gitignored

---

# Front-end (bom-acai-front)

## Stack
- **Angular 21** — Standalone Components (no NgModules)
- **PrimeNG 21** — UI component library
- **PrimeFlex** — utility CSS (flex, spacing, grid)
- **PrimeIcons** — icon set
- **@primeuix/themes** — theming engine (replaces deprecated @primeng/themes)

## Theme
Aura preset with primary color overridden to **purple** (`AuraLightPurple` preset defined in `app.config.ts`).
Dark mode disabled (`darkModeSelector: false`).

## Key files
```
bom-acai-front/
├── src/
│   ├── main.ts               ← bootstrap
│   ├── styles.scss           ← global styles (primeflex + primeicons)
│   └── app/
│       ├── app.config.ts     ← providePrimeNG + Aura theme + provideAnimationsAsync
│       ├── app.routes.ts     ← route definitions
│       ├── app.ts            ← root component
│       └── app.html          ← root template
```

## Conventions
- All components are **standalone** (`standalone: true`)
- Styles: **SCSS**
- Import PrimeNG components directly in each standalone component's `imports` array
- Use PrimeFlex utility classes for layout (no custom CSS grids)

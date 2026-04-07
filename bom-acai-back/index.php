<?php

declare(strict_types=1);

date_default_timezone_set('America/Argentina/Buenos_Aires');

require_once __DIR__ . '/flight/Flight.php';

// Core
require_once __DIR__ . '/app/core/ApiResponse.php';

// Config
require_once __DIR__ . '/app/config/Database.php';

// Services
require_once __DIR__ . '/app/services/AuthService.php';
require_once __DIR__ . '/app/services/CategoryService.php';
require_once __DIR__ . '/app/services/ProductService.php';
require_once __DIR__ . '/app/services/ProductPresentationService.php';
require_once __DIR__ . '/app/services/ExtraService.php';

// Controllers
require_once __DIR__ . '/app/controllers/AuthController.php';
require_once __DIR__ . '/app/controllers/CategoryController.php';
require_once __DIR__ . '/app/controllers/ProductController.php';
require_once __DIR__ . '/app/controllers/ProductPresentationController.php';
require_once __DIR__ . '/app/controllers/ExtraController.php';

// Middleware
require_once __DIR__ . '/app/middleware/AuthMiddleware.php';

// ── Global before filter ─────────────────────────────────────────────────────
Flight::before('start', function () {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');

    // Handle preflight
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
});

// ── Public routes ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/app/routes/auth.php';

// ── Protected routes ──────────────────────────────────────────────────────────
Flight::group('/api', function () {
    require_once __DIR__ . '/app/routes/categories.php';
    require_once __DIR__ . '/app/routes/products.php';
    require_once __DIR__ . '/app/routes/product_presentations.php';
    require_once __DIR__ . '/app/routes/extras.php';
}, [new AuthMiddleware()]);

Flight::start();

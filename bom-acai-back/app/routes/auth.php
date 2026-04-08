<?php

declare(strict_types=1);

// Public
Flight::route('GET /captcha',     [CaptchaController::class, 'generate']);
Flight::route('POST /auth/login', [AuthController::class, 'login']);

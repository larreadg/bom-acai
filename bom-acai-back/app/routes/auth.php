<?php

declare(strict_types=1);

// Public
Flight::route('POST /auth/login', [AuthController::class, 'login']);

<?php

declare(strict_types=1);

class AuthMiddleware
{
    public function before(): void
    {
        $authHeader = Flight::request()->getHeader('Authorization');

        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches) !== 1) {
            ApiResponse::error('Missing or invalid Authorization header', 401)->send();
            Flight::stop();
            return;
        }

        $authService = new AuthService();

        if ($authService->validateToken($matches[1]) === false) {
            ApiResponse::error('Invalid or expired token', 401)->send();
            Flight::stop();
        }
    }
}

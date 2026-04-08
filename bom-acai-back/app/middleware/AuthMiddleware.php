<?php

declare(strict_types=1);

class AuthMiddleware
{
    public function before(): void
    {
        $authHeader = $this->getAuthorizationHeader();

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

    private function getAuthorizationHeader(): string
    {
        $header = Flight::request()->getHeader('Authorization');

        if ($header !== '') {
            return $header;
        }

        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $key => $value) {
                if (strcasecmp((string) $key, 'Authorization') === 0) {
                    return (string) $value;
                }
            }
        }

        return '';
    }
}

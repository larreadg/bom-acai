<?php

declare(strict_types=1);

class AuthController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function login(): void
    {
        $body     = Flight::request()->data->getData();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');

        if ($username === '' || $password === '') {
            ApiResponse::error('username and password are required', 400)->send();
            return;
        }

        $token = $this->authService->login($username, $password);

        if ($token === null) {
            ApiResponse::error('Invalid credentials', 401)->send();
            return;
        }

        ApiResponse::success('Login successful', [
            'token'      => $token,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+24 hours')),
        ])->send();
    }
}

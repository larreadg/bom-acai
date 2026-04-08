<?php

declare(strict_types=1);

class AuthController
{
    private AuthService    $authService;
    private CaptchaService $captchaService;

    public function __construct()
    {
        $this->authService    = new AuthService();
        $this->captchaService = new CaptchaService();
    }

    public function login(): void
    {
        $body          = Flight::request()->data->getData();
        $username      = trim($body['username']       ?? '');
        $password      = trim($body['password']       ?? '');
        $captchaToken  = trim($body['captcha_token']  ?? '');
        $captchaAnswer = trim($body['captcha_answer'] ?? '');

        if ($username === '' || $password === '') {
            ApiResponse::error('username and password are required', 400)->send();
            return;
        }

        if ($captchaToken === '' || $captchaAnswer === '') {
            ApiResponse::error('captcha_token and captcha_answer are required', 400)->send();
            return;
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        if (!$this->captchaService->validate($captchaToken, $captchaAnswer, $ip)) {
            ApiResponse::error('Código de verificación incorrecto o expirado', 400)->send();
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

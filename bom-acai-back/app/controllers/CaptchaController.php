<?php

declare(strict_types=1);

class CaptchaController
{
    private CaptchaService $service;

    public function __construct()
    {
        $this->service = new CaptchaService();
    }

    public function generate(): void
    {
        $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $data = $this->service->generate($ip);

        ApiResponse::success('OK', $data)->send();
    }
}

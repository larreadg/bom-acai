<?php

declare(strict_types=1);

class QzController
{
    private QzSecurityService $service;

    public function __construct()
    {
        $this->service = new QzSecurityService();
    }

    public function certificate(): void
    {
        try {
            ApiResponse::success('QZ certificate loaded', [
                'certificate' => $this->service->getCertificate(),
            ])->send();
        } catch (Throwable $e) {
            ApiResponse::error($e->getMessage(), 500)->send();
        }
    }

    public function sign(): void
    {
        $payload = $this->extractPayload();

        if ($payload === null || $payload === '') {
            ApiResponse::error('El payload a firmar es obligatorio', 400)->send();
            return;
        }

        try {
            ApiResponse::success('Payload signed', [
                'signature' => $this->service->sign($payload),
            ])->send();
        } catch (InvalidArgumentException $e) {
            ApiResponse::error($e->getMessage(), 400)->send();
        } catch (Throwable $e) {
            ApiResponse::error($e->getMessage(), 500)->send();
        }
    }

    private function extractPayload(): ?string
    {
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        $rawBody = file_get_contents('php://input');

        if (str_contains($contentType, 'application/json')) {
            $decoded = json_decode($rawBody ?: '', true);

            if (!is_array($decoded)) {
                return null;
            }

            $payload = $decoded['payload'] ?? $decoded['data'] ?? null;
            return is_string($payload) ? $payload : null;
        }

        return $rawBody === false ? null : $rawBody;
    }
}

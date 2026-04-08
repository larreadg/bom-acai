<?php

declare(strict_types=1);

class QzSecurityService
{
    public function getCertificate(): string
    {
        $certificatePath = QzTray::certificatePath();
        $certificate = @file_get_contents($certificatePath);

        if ($certificate === false || trim($certificate) === '') {
            throw new RuntimeException('No se pudo leer el certificado publico de QZ Tray');
        }

        return $certificate;
    }

    public function sign(string $payload): string
    {
        if ($payload === '') {
            throw new InvalidArgumentException('El payload a firmar no puede estar vacio');
        }

        if (!function_exists('openssl_pkey_get_private') || !function_exists('openssl_sign')) {
            throw new RuntimeException('OpenSSL no esta disponible en el backend');
        }

        $privateKeyPath = QzTray::privateKeyPath();
        $privateKeyPem = @file_get_contents($privateKeyPath);

        if ($privateKeyPem === false || trim($privateKeyPem) === '') {
            throw new RuntimeException('No se pudo leer la clave privada de QZ Tray');
        }

        $privateKey = openssl_pkey_get_private($privateKeyPem);

        if ($privateKey === false) {
            throw new RuntimeException('La clave privada de QZ Tray no es valida');
        }

        $signature = '';
        $signed = openssl_sign($payload, $signature, $privateKey, OPENSSL_ALGO_SHA512);
        openssl_free_key($privateKey);

        if ($signed !== true) {
            throw new RuntimeException('No se pudo firmar el payload de QZ Tray');
        }

        return base64_encode($signature);
    }
}

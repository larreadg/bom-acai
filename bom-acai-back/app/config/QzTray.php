<?php

declare(strict_types=1);

class QzTray
{
    public static function certificatePath(): string
    {
        return self::resolvePath('QZ_CERTIFICATE_PATH', [
            self::certsDir() . DIRECTORY_SEPARATOR . 'digital-certificate.txt',
        ]);
    }

    public static function privateKeyPath(): string
    {
        return self::resolvePath('QZ_PRIVATE_KEY_PATH', [
            self::certsDir() . DIRECTORY_SEPARATOR . 'private-key-pkcs8.pem',
            self::certsDir() . DIRECTORY_SEPARATOR . 'private-key.pem',
        ]);
    }

    private static function certsDir(): string
    {
        return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'qztray-certs';
    }

    private static function resolvePath(string $envVar, array $fallbacks): string
    {
        $envPath = trim((string) getenv($envVar));

        if ($envPath !== '') {
            return $envPath;
        }

        foreach ($fallbacks as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return $fallbacks[0];
    }
}

<?php

declare(strict_types=1);

class ImageService
{
    private const MAX_BYTES     = 500 * 1024; // 500 KB
    private const MAX_DIMENSION = 1200;       // px — longer side
    private const SAVE_DIR      = 'public/presentations';
    private const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    /**
     * Validate, compress and persist an uploaded image.
     * Returns the relative path (e.g. "public/presentations/7.jpg") or false on failure.
     */
    public function save(array $file, int $presentationId): string|false
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return false;
        }

        $mimeType = mime_content_type($file['tmp_name']);

        if (!in_array($mimeType, self::ALLOWED_MIME, true)) {
            return false;
        }

        $img = $this->loadImage($file['tmp_name'], $mimeType);

        if ($img === false) {
            return false;
        }

        $saveDir = __DIR__ . '/../../' . self::SAVE_DIR;

        if (!is_dir($saveDir)) {
            mkdir($saveDir, 0755, true);
        }

        $destPath     = $saveDir . '/' . $presentationId . '.jpg';
        $relativePath = self::SAVE_DIR . '/' . $presentationId . '.jpg';

        $ok = $this->compress($img, $destPath, imagesx($img), imagesy($img));
        imagedestroy($img);

        return $ok ? $relativePath : false;
    }

    /**
     * Delete an image file stored under public/presentations/.
     */
    public function delete(string $relativePath): void
    {
        if (!str_starts_with($relativePath, self::SAVE_DIR . '/')) {
            return;
        }

        $fullPath = __DIR__ . '/../../' . $relativePath;

        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function loadImage(string $path, string $mimeType): \GdImage|false
    {
        return match ($mimeType) {
            'image/jpeg' => imagecreatefromjpeg($path),
            'image/png'  => imagecreatefrompng($path),
            'image/gif'  => imagecreatefromgif($path),
            'image/webp' => imagecreatefromwebp($path),
            default      => false,
        };
    }

    /**
     * Resize (if needed) and compress to JPEG until the file fits within MAX_BYTES.
     */
    private function compress(\GdImage $src, string $dest, int $origW, int $origH): bool
    {
        // Resize if either dimension exceeds MAX_DIMENSION
        $ratio = max($origW, $origH) / self::MAX_DIMENSION;

        if ($ratio > 1.0) {
            $newW = (int) round($origW / $ratio);
            $newH = (int) round($origH / $ratio);
            $resized = imagecreatetruecolor($newW, $newH);

            // Preserve white background for transparent PNGs
            imagefilledrectangle($resized, 0, 0, $newW - 1, $newH - 1, imagecolorallocate($resized, 255, 255, 255));
            imagecopyresampled($resized, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            $img = $resized;
        } else {
            // Flatten transparency to white before JPEG output
            $img = imagecreatetruecolor($origW, $origH);
            imagefilledrectangle($img, 0, 0, $origW - 1, $origH - 1, imagecolorallocate($img, 255, 255, 255));
            imagecopy($img, $src, 0, 0, 0, 0, $origW, $origH);
        }

        $quality = 85;
        $saved   = false;

        while ($quality >= 20) {
            imagejpeg($img, $dest, $quality);

            if (filesize($dest) <= self::MAX_BYTES) {
                $saved = true;
                break;
            }

            $quality -= 10;
        }

        if (!$saved) {
            // Last attempt at minimum quality
            imagejpeg($img, $dest, 20);
            $saved = true;
        }

        imagedestroy($img);

        return $saved;
    }
}

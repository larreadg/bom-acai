<?php

declare(strict_types=1);

class CaptchaService
{
    // CAPTCHA config
    private const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
    private const LENGTH  = 5;
    private const TTL     = 300;   // 5 minutes
    private const IMG_W   = 220;
    private const IMG_H   = 64;

    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->ensureTable();
        $this->purgeExpired();
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Generate a new CAPTCHA for the given IP.
     * Returns ['token' => string, 'image' => 'data:image/png;base64,...']
     */
    public function generate(string $ip): array
    {
        $answer    = $this->randomAnswer();
        $token     = bin2hex(random_bytes(16));
        $expiresAt = date('Y-m-d H:i:s', time() + self::TTL);

        $this->db->prepare(
            'INSERT INTO "captcha_challenges" ("token", "answer", "ip", "expires_at") VALUES (?, ?, ?, ?)'
        )->execute([$token, $answer, $ip, $expiresAt]);

        return [
            'token' => $token,
            'image' => $this->buildImage($answer),
        ];
    }

    /**
     * Validate a CAPTCHA answer.
     * Always marks the token as used (even on wrong answer) to prevent brute-force.
     */
    public function validate(string $token, string $answer, string $ip): bool
    {
        $stmt = $this->db->prepare(
            'SELECT "answer" FROM "captcha_challenges"
             WHERE "token" = ? AND "ip" = ? AND "used" = 0 AND "expires_at" > ?
             LIMIT 1'
        );
        $stmt->execute([$token, $ip, date('Y-m-d H:i:s')]);
        $row = $stmt->fetch();

        // Mark as used regardless of outcome
        if ($row !== false) {
            $this->db->prepare('UPDATE "captcha_challenges" SET "used" = 1 WHERE "token" = ?')
                     ->execute([$token]);
        }

        return $row !== false && strtoupper(trim($answer)) === $row['answer'];
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function randomAnswer(): string
    {
        $charset = self::CHARSET;
        $len     = strlen($charset);
        $result  = '';

        for ($i = 0; $i < self::LENGTH; $i++) {
            $result .= $charset[random_int(0, $len - 1)];
        }

        return $result;
    }

    private function buildImage(string $text): string
    {
        $w = self::IMG_W;
        $h = self::IMG_H;

        $img = imagecreatetruecolor($w, $h);

        // ── Colours ──────────────────────────────────────────────────────────
        $bg       = imagecolorallocate($img, 245, 243, 255); // very light purple
        $noise    = imagecolorallocate($img, 200, 195, 220);
        $lineclr  = imagecolorallocate($img, 190, 185, 215);

        imagefilledrectangle($img, 0, 0, $w - 1, $h - 1, $bg);

        // ── Background noise: dots ────────────────────────────────────────────
        for ($i = 0; $i < 900; $i++) {
            imagesetpixel($img, random_int(0, $w - 1), random_int(0, $h - 1), $noise);
        }

        // ── Background noise: lines ───────────────────────────────────────────
        for ($i = 0; $i < 5; $i++) {
            imageline(
                $img,
                random_int(0, (int) ($w * 0.4)), random_int(0, $h),
                random_int((int) ($w * 0.6), $w), random_int(0, $h),
                $lineclr
            );
        }

        // ── Characters ────────────────────────────────────────────────────────
        // GD built-in font 5: each char is 9 px wide, 15 px tall
        $charW   = 9;
        $totalW  = self::LENGTH * $charW;
        $padding = (int) (($w - $totalW) / (self::LENGTH + 1));
        $x       = $padding;

        for ($i = 0; $i < self::LENGTH; $i++) {
            $y     = random_int(10, $h - 26); // random vertical position
            $r     = random_int(25, 90);
            $g     = random_int(25, 90);
            $b     = random_int(100, 180);
            $color = imagecolorallocate($img, $r, $g, $b);

            imagestring($img, 5, $x, $y, $text[$i], $color);

            $x += $charW + $padding + random_int(-2, 4); // slight horizontal jitter
        }

        // ── Foreground noise: more dots on top of text ────────────────────────
        for ($i = 0; $i < 300; $i++) {
            imagesetpixel($img, random_int(0, $w - 1), random_int(0, $h - 1), $noise);
        }

        // ── Encode to base64 ─────────────────────────────────────────────────
        ob_start();
        imagepng($img);
        $raw = (string) ob_get_clean();
        imagedestroy($img);

        return 'data:image/png;base64,' . base64_encode($raw);
    }

    private function ensureTable(): void
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS "captcha_challenges" (
                "id"         INTEGER  PRIMARY KEY AUTOINCREMENT,
                "token"      TEXT     NOT NULL UNIQUE,
                "answer"     TEXT     NOT NULL,
                "ip"         TEXT     NOT NULL,
                "expires_at" DATETIME NOT NULL,
                "used"       INTEGER  NOT NULL DEFAULT 0
            )'
        );
    }

    private function purgeExpired(): void
    {
        $this->db->prepare('DELETE FROM "captcha_challenges" WHERE "expires_at" <= ?')
                 ->execute([date('Y-m-d H:i:s')]);
    }
}

<?php

declare(strict_types=1);

class AuthService
{
    /**
     * Validates credentials and returns a new Bearer token, or null on failure.
     */
    public function login(string $username, string $password): ?string
    {
        $db   = Database::connection();
        $stmt = $db->prepare('SELECT "id", "password_hash" FROM "users" WHERE "username" = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user === false || password_verify($password, $user['password_hash']) === false) {
            return null;
        }

        // Remove expired tokens for this user
        $db->prepare('DELETE FROM "auth_tokens" WHERE "user_id" = ? AND "expires_at" <= datetime("now")')
           ->execute([$user['id']]);

        $token     = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $db->prepare('INSERT INTO "auth_tokens" ("user_id", "token_hash", "expires_at") VALUES (?, ?, ?)')
           ->execute([$user['id'], $tokenHash, $expiresAt]);

        return $token;
    }

    /**
     * Returns true if the given raw token exists and has not expired.
     */
    public function validateToken(string $token): bool
    {
        $tokenHash = hash('sha256', $token);
        $stmt      = Database::connection()->prepare(
            'SELECT "id" FROM "auth_tokens" WHERE "token_hash" = ? AND "expires_at" > datetime("now") LIMIT 1'
        );
        $stmt->execute([$tokenHash]);

        return $stmt->fetch() !== false;
    }
}

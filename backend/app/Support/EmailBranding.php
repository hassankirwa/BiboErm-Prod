<?php

namespace App\Support;

final class EmailBranding
{
    public const PRIMARY = '#ec2024';

    public const PRIMARY_HOVER = '#c9191d';

    public const TEXT = '#18181b';

    public const MUTED = '#52525b';

    public static function frontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/');
    }

    public static function isLocalFrontend(): bool
    {
        $host = parse_url(self::frontendUrl(), PHP_URL_HOST);

        return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }

    /**
     * Absolute logo URL from the frontend public folder (e.g. /image.png).
     * Hidden on localhost — email clients cannot load localhost assets anyway.
     */
    public static function logoUrl(): ?string
    {
        if (self::isLocalFrontend()) {
            return null;
        }

        return self::frontendUrl().'/image.png';
    }
}

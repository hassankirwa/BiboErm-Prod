<?php

namespace App\Services\Mail;

final class MailDeliveryResult
{
    /**
     * @param  array<string, mixed>|null  $devDetails
     */
    private function __construct(
        public readonly bool $sent,
        public readonly ?string $warning = null,
        public readonly ?array $devDetails = null,
    ) {}

    public static function sent(): self
    {
        return new self(sent: true);
    }

    public static function notConfigured(?array $devDetails = null): self
    {
        return new self(
            sent: false,
            warning: \App\Support\MailConfig::notConfiguredReason(),
            devDetails: $devDetails,
        );
    }

    public static function failed(string $message): self
    {
        return new self(sent: false, warning: $message);
    }
}

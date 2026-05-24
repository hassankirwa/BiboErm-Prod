<?php

namespace App\Support;

final class MailConfig
{
    public static function mailer(): string
    {
        return (string) config('mail.default', 'log');
    }

    public static function isDeliverable(): bool
    {
        $mailer = self::mailer();

        if (in_array($mailer, ['log', 'array'], true)) {
            return false;
        }

        if ($mailer !== 'smtp') {
            return true;
        }

        $host = trim((string) config('mail.mailers.smtp.host', ''));
        $username = trim((string) config('mail.mailers.smtp.username', ''));
        $password = trim((string) config('mail.mailers.smtp.password', ''));

        return $host !== '' && $username !== '' && $password !== '';
    }

    public static function notConfiguredReason(): string
    {
        if (in_array(self::mailer(), ['log', 'array'], true)) {
            return __('Mail is set to :mailer — configure SMTP in .env to send emails.', [
                'mailer' => self::mailer(),
            ]);
        }

        if (self::mailer() === 'smtp') {
            return __('SMTP is incomplete — set MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD in .env.');
        }

        return __('Mail delivery is not configured.');
    }
}

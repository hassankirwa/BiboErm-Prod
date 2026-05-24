<?php

namespace App\Services\Mail;

use App\Support\MailConfig;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class OutgoingMailService
{
    public function send(Mailable $mailable, string $recipient): MailDeliveryResult
    {
        if (! MailConfig::isDeliverable()) {
            $devDetails = $this->extractDevDetails($mailable);

            Log::channel('stack')->info('Mail not sent — delivery not configured.', [
                'recipient' => $recipient,
                'mailable' => $mailable::class,
                'details' => $devDetails,
            ]);

            return MailDeliveryResult::notConfigured(
                app()->environment('local') ? $devDetails : null
            );
        }

        try {
            Mail::to($recipient)->send($mailable);

            return MailDeliveryResult::sent();
        } catch (Throwable $exception) {
            Log::error('Mail delivery failed.', [
                'recipient' => $recipient,
                'mailable' => $mailable::class,
                'error' => $exception->getMessage(),
            ]);

            return MailDeliveryResult::failed(
                __('Unable to send email. Check SMTP settings and try again.')
            );
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractDevDetails(Mailable $mailable): ?array
    {
        if (! property_exists($mailable, 'user')) {
            return null;
        }

        $details = [
            'email' => $mailable->user->email ?? null,
        ];

        if (property_exists($mailable, 'tempPasswordPlain')) {
            $details['temporary_password'] = $mailable->tempPasswordPlain;
        }

        if (property_exists($mailable, 'plainInviteToken')) {
            $frontend = rtrim((string) config('app.frontend_url'), '/');
            $details['accept_url'] = $frontend.'/accept-invite?token='.$mailable->plainInviteToken;
            $details['login_url'] = $frontend.'/';
        }

        return $details;
    }
}

<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\Mail\MailDeliveryResult;

final class InvitationResult
{
    /**
     * @param  array<string, mixed>|null  $devMailDetails
     */
    public function __construct(
        public readonly User $user,
        public readonly bool $mailSent,
        public readonly ?string $mailWarning = null,
        public readonly ?array $devMailDetails = null,
    ) {}

    public static function fromMail(User $user, MailDeliveryResult $mail): self
    {
        return new self(
            user: $user,
            mailSent: $mail->sent,
            mailWarning: $mail->warning,
            devMailDetails: $mail->devDetails,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $payload = [
            'message' => $this->mailSent
                ? __('Invitation email sent.')
                : __('User created but invitation email was not sent.'),
            'user_id' => $this->user->id,
            'mail_sent' => $this->mailSent,
        ];

        if ($this->mailWarning) {
            $payload['mail_warning'] = $this->mailWarning;
        }

        if ($this->devMailDetails && app()->environment('local')) {
            $payload['dev_mail'] = $this->devMailDetails;
        }

        return $payload;
    }
}

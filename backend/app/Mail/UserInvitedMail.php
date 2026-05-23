<?php

namespace App\Mail;

use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserInvitedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $plainInviteToken,
        public string $tempPasswordPlain,
        public UserInvitation $invitation,
    ) {}

    public function envelope(): \Illuminate\Mail\Mailables\Envelope
    {
        return new \Illuminate\Mail\Mailables\Envelope(
            subject: __('You have been invited to Bibo ERM'),
        );
    }

    public function content(): \Illuminate\Mail\Mailables\Content
    {
        return new \Illuminate\Mail\Mailables\Content(
            markdown: 'emails.users.invited',
            with: [
                'acceptUrl' => rtrim((string) config('app.frontend_url'), '/').'/accept-invite?token='.$this->plainInviteToken,
                'loginUrl' => rtrim((string) config('app.frontend_url'), '/').'/login',
                'temporaryPassword' => $this->tempPasswordPlain,
                'expiresAt' => $this->invitation->expires_at,
            ],
        );
    }
}

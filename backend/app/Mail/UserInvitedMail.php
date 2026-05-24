<?php

namespace App\Mail;

use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserInvitedMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public User $user,
        public string $plainInviteToken,
        public string $tempPasswordPlain,
        public UserInvitation $invitation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('Your Bibo ERM login details'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.users.invitation-html',
            with: [
                'acceptUrl' => rtrim((string) config('app.frontend_url'), '/').'/accept-invite?token='.$this->plainInviteToken,
                'loginUrl' => rtrim((string) config('app.frontend_url'), '/').'/',
                'temporaryPassword' => $this->tempPasswordPlain,
                'expiresAt' => $this->invitation->expires_at,
            ],
        );
    }
}

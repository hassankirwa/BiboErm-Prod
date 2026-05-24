<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountApprovedMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public User $user,
        public string $workspacePath,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('Your Bibo ERM account is ready'),
        );
    }

    public function content(): Content
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');

        return new Content(
            view: 'emails.users.account-approved-html',
            with: [
                'loginUrl' => $frontend.'/',
                'workspaceUrl' => $frontend.$this->workspacePath,
            ],
        );
    }
}

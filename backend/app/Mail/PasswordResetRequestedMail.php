<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetRequestedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token,
    ) {}

    public function envelope(): \Illuminate\Mail\Mailables\Envelope
    {
        return new \Illuminate\Mail\Mailables\Envelope(
            subject: __('Reset your password — Bibo ERM'),
        );
    }

    public function content(): \Illuminate\Mail\Mailables\Content
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $resetUrl = $frontend.'/reset-password?token='.urlencode($this->token).'&email='.urlencode($this->user->email);

        return new \Illuminate\Mail\Mailables\Content(
            markdown: 'emails.users.password-reset',
            with: [
                'resetUrl' => $resetUrl,
                'minutes' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 15),
            ],
        );
    }
}

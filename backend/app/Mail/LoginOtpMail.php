<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class LoginOtpMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public User $user,
        public string $plainCode,
        public Carbon $expiresAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('Your Bibo sign-in code'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.login-otp-html',
            with: [
                'code' => $this->plainCode,
                'expiresAt' => $this->expiresAt,
            ],
        );
    }
}

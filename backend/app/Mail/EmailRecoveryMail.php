<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

class EmailRecoveryMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $emailHint,
        public string $emailAddress,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to: [new Address($this->emailAddress)],
            subject: __('Your Bibo login email'),
        );
    }

    public function content(): \Illuminate\Mail\Mailables\Content
    {
        return new \Illuminate\Mail\Mailables\Content(
            markdown: 'emails.users.email-recovered',
            with: [
                'emailHint' => $this->emailHint,
                'frontendUrl' => rtrim((string) config('app.frontend_url'), '/'),
            ],
        );
    }
}

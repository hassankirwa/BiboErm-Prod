@php
    use App\Support\EmailBranding;

    $brandPrimary = EmailBranding::PRIMARY;
@endphp
@extends('emails.layouts.bibo-html')

@section('content')
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:{{ EmailBranding::TEXT }};">
        {{ __('Sign-in verification code') }}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:{{ EmailBranding::MUTED }};">
        {{ __('Hi :name, use this code to finish signing in to :app.', ['name' => $user->name, 'app' => config('app.name')]) }}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
        <tr>
            <td style="padding:20px 18px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;color:{{ $brandPrimary }};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">
                    {{ __('Your code') }}
                </p>
                <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:{{ EmailBranding::TEXT }};">
                    {{ $code }}
                </p>
            </td>
        </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">
        {{ __('This code expires') }} {{ $expiresAt->timezone(config('app.timezone'))->format('D, M j, Y g:i A T') }}.
        {{ __('If you did not try to sign in, you can ignore this email.') }}
    </p>
@endsection

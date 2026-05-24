@php
    use App\Support\EmailBranding;

    $brandPrimary = EmailBranding::PRIMARY;
@endphp
@extends('emails.layouts.bibo-html')

@section('content')
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:{{ EmailBranding::TEXT }};">
        {{ __('You have been invited') }}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:{{ EmailBranding::MUTED }};">
        {{ __('Welcome to :app. Use the credentials below to sign in. You will be required to set a new password on first login.', ['app' => config('app.name')]) }}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
        <tr>
            <td style="padding:16px 18px;">
                <p style="margin:0 0 10px;font-size:13px;color:{{ $brandPrimary }};text-transform:uppercase;letter-spacing:0.04em;font-weight:700;">
                    {{ __('Login details') }}
                </p>
                <p style="margin:0 0 8px;font-size:15px;color:{{ EmailBranding::TEXT }};">
                    <strong>{{ __('Email') }}:</strong> {{ $user->email }}
                </p>
                <p style="margin:0;font-size:15px;color:{{ EmailBranding::TEXT }};">
                    <strong>{{ __('Temporary password') }}:</strong>
                    <code style="background:#fff;border:1px solid #fecaca;border-radius:4px;padding:2px 6px;font-size:14px;color:{{ $brandPrimary }};">{{ $temporaryPassword }}</code>
                </p>
            </td>
        </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
        <tr>
            <td style="border-radius:8px;background:{{ $brandPrimary }};">
                <a href="{{ $loginUrl }}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    {{ __('Sign in to Bibo') }}
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:{{ EmailBranding::MUTED }};">
        {{ __('Prefer to set your password from the invitation link?') }}
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
        <tr>
            <td style="border-radius:8px;border:2px solid {{ $brandPrimary }};">
                <a href="{{ $acceptUrl }}" style="display:inline-block;padding:11px 18px;font-size:14px;font-weight:600;color:{{ $brandPrimary }};text-decoration:none;">
                    {{ __('Accept invitation & set password') }}
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">
        {{ __('Invitation link expires') }} {{ $expiresAt->timezone(config('app.timezone'))->format('D, M j, Y g:i A T') }}.
    </p>
@endsection

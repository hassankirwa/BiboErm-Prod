@php
    use App\Support\EmailBranding;

    $brandPrimary = EmailBranding::PRIMARY;
@endphp
@extends('emails.layouts.bibo-html')

@section('content')
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:{{ EmailBranding::TEXT }};">
        {{ __('You\'re all set, :name!', ['name' => $user->name]) }}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:{{ EmailBranding::MUTED }};">
        {{ __('HR has approved your account. You can sign in and start using :app.', ['app' => config('app.name')]) }}
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
        <tr>
            <td style="border-radius:8px;background:{{ $brandPrimary }};">
                <a href="{{ $workspaceUrl }}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    {{ __('Go to your workspace') }}
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0;font-size:14px;line-height:1.6;color:{{ EmailBranding::MUTED }};">
        {{ __('Or sign in at') }}
        <a href="{{ $loginUrl }}" style="color:{{ $brandPrimary }};text-decoration:none;font-weight:600;">{{ $loginUrl }}</a>
    </p>
@endsection

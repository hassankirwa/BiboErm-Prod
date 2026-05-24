@php
    use App\Support\EmailBranding;

    $brandPrimary = EmailBranding::PRIMARY;
    $brandName = config('app.name');
    $logoUrl = EmailBranding::logoUrl();
    $loginHomeUrl = EmailBranding::frontendUrl();
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $subject ?? $brandName }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{{ EmailBranding::TEXT }};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
                <tr>
                    <td style="background:#ffffff;padding:24px 28px 20px;border-bottom:3px solid {{ $brandPrimary }};">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center">
                                    @if ($logoUrl)
                                        <a href="{{ $loginHomeUrl }}" style="text-decoration:none;display:inline-block;">
                                            <img
                                                src="{{ $logoUrl }}"
                                                alt="{{ $brandName }}"
                                                width="140"
                                                height="40"
                                                style="display:block;height:32px;width:auto;max-width:160px;border:0;"
                                            />
                                        </a>
                                    @else
                                        <a href="{{ $loginHomeUrl }}" style="text-decoration:none;">
                                            <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:{{ $brandPrimary }};">
                                                {{ $brandName }}
                                            </span>
                                        </a>
                                    @endif
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:28px;">
                        @yield('content')
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 28px 24px;border-top:1px solid #f4f4f5;background:#fafafa;">
                        <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                            {{ __('This is an automated message from :app. If you did not expect this email, contact your administrator.', ['app' => $brandName]) }}
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>

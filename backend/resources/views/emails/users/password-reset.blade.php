<x-mail::message>
# {{ __('Reset password') }}

{{ __('We received a request to reset your Bibo login password.') }}

<x-mail::button :url="$resetUrl">
{{ __('Reset password') }}
</x-mail::button>

<p style="color:#666;font-size:13px">{{ __('This link expires in :minutes minutes.', ['minutes' => $minutes]) }}</p>

{{ __('Best regards') }}<br>
{{ config('app.name') }}
</x-mail::message>

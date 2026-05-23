<x-mail::message>
# {{ __('You are invited') }}

{{ __('Welcome to Bibo ERM.') }}

**{{ __('Email') }}:** {{ $user->email }}

**{{ __('Temporary password') }}:** {{ $temporaryPassword }}

{{ __('Accept your invitation to choose a new password:') }}

<x-mail::button :url="$acceptUrl">
{{ __('Accept invitation') }}
</x-mail::button>

<x-mail::button :url="$loginUrl" color="secondary">
{{ __('Open login') }}
</x-mail::button>

<p style="margin-top:24px;color:#666;font-size:13px">{{ __('Invitation expires') }} {{ $expiresAt->toDayDateTimeString() }}.</p>

{{ __('Best regards') }}<br>
{{ config('app.name') }}
</x-mail::message>

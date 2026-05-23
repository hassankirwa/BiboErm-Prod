<x-mail::message>
# {{ __('Your login email') }}

{{ __('The account tied to your employee number uses this inbox:') }}

**{{ $emailHint }}**

{{ __('Try signing in') }} → [{{ __('Open login page') }}]({{ $frontendUrl }}/login)

{{ __('If you still cannot access your inbox, please contact IT support.') }}

{{ __('Best regards') }}<br>
{{ config('app.name') }}
</x-mail::message>

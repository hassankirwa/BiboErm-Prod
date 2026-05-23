<?php

return [
    'admin' => [
        'name' => env('ADMIN_NAME', 'Bibo System Admin'),
        'email' => env('ADMIN_EMAIL', 'admin@bibo.com'),
        'password' => env('ADMIN_PASSWORD', 'Admin@2026!!'),
        'seed_on_boot' => env('ADMIN_SEED_ON_BOOT', false),
    ],
    'refresh_token' => [
        'cookie' => env('REFRESH_TOKEN_COOKIE', 'refresh_token'),
        'expire_days' => (int) env('REFRESH_TOKEN_EXPIRE_DAYS', 30),
    ],
    'invite' => [
        'expire_hours' => (int) env('INVITE_EXPIRY_HOURS', 72),
    ],
    'avatar_disk' => env('AVATAR_DISK', 'public'),
    'avatar_max_kb' => (int) env('AVATAR_MAX_KB', 2048),
    'device_lock' => [
        'enabled' => env('DEVICE_LOCK_ENABLED', false),
        'enforce_on_roles' => array_filter(array_map('trim', explode(',', env('DEVICE_LOCK_ENFORCE_ROLES', '')))),
    ],
    'rate_limit' => [
        'invite_per_hour' => (int) env('INVITE_RATE_LIMIT_PER_HOUR', 10),
        'forgot_password_per_minute' => (int) env('FORGOT_PASSWORD_RATE_LIMIT_PER_MIN', 5),
        'reset_password_per_minute' => (int) env('RESET_PASSWORD_RATE_LIMIT_PER_MIN', 10),
        'recover_email_per_minute' => (int) env('RECOVER_EMAIL_RATE_LIMIT_PER_MIN', 5),
        'login_per_minute' => (int) env('LOGIN_RATE_LIMIT_PER_MIN', 5),
        'refresh_per_minute' => (int) env('REFRESH_RATE_LIMIT_PER_MIN', 30),
        'accept_invite_per_minute' => (int) env('ACCEPT_INVITE_RATE_LIMIT_PER_MIN', 10),
    ],
];

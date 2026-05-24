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

    /*
    | Project file storage (outside backend/) — profiles, field-work, etc.
    | Run once: php artisan storage:link  (symlinks public/media → ../storage/public)
    */
    'storage' => [
        'path' => env('BIBO_STORAGE_PATH'),
        'disk' => env('BIBO_STORAGE_DISK', 'bibo'),
        'url' => env('BIBO_STORAGE_URL'),
        'categories' => [
            'profiles' => [
                'public' => true,
                'max_kb' => (int) env('BIBO_PROFILE_MAX_KB', 2048),
                'max_width' => (int) env('BIBO_PROFILE_MAX_WIDTH', 4096),
                'max_height' => (int) env('BIBO_PROFILE_MAX_HEIGHT', 4096),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
                'image_only' => true,
            ],
            'field-work' => [
                'public' => false,
                'max_kb' => (int) env('BIBO_FIELD_WORK_MAX_KB', 10240),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
                'image_only' => false,
                'permissions' => ['leads.view', 'leads.create'],
            ],
        ],
    ],

    'device_lock' => [
        'enabled' => env('DEVICE_LOCK_ENABLED', false),
        'enforce_on_roles' => array_filter(array_map('trim', explode(',', env('DEVICE_LOCK_ENFORCE_ROLES', '')))),
    ],

    'hr' => [
        'employee_number_prefix' => env('BIBO_EMPLOYEE_NUMBER_PREFIX', 'EMP'),
        'employee_number_pad' => (int) env('BIBO_EMPLOYEE_NUMBER_PAD', 4),
    ],

    'two_factor' => [
        'otp_expire_minutes' => (int) env('TWO_FACTOR_OTP_EXPIRE_MINUTES', 10),
    ],
    /*
    | Allowed Spatie role names per department slug (invite / assignment UI).
    */
    'department_roles' => [
        'sales_marketing' => ['sales_representative', 'field_officer'],
        'production' => ['production_manager'],
        'warehouse' => ['warehouse_manager_accessories', 'warehouse_manager_aluminium'],
        'procurement' => ['procurement_officer'],
        'quality_control' => ['qc_inspector'],
        'hr' => ['hr_manager'],
        'finance' => ['finance_officer'],
        'it' => ['it_admin', 'super_admin'],
        'project_management' => ['project_manager'],
        'operations' => ['operations_manager', 'field_officer', 'reception'],
        'reception' => ['reception'],
    ],

    'rate_limit' => [
        'invite_per_hour' => (int) env('INVITE_RATE_LIMIT_PER_HOUR', 10),
        'forgot_password_per_minute' => (int) env('FORGOT_PASSWORD_RATE_LIMIT_PER_MIN', 5),
        'reset_password_per_minute' => (int) env('RESET_PASSWORD_RATE_LIMIT_PER_MIN', 10),
        'recover_email_per_minute' => (int) env('RECOVER_EMAIL_RATE_LIMIT_PER_MIN', 5),
        'login_per_minute' => (int) env('LOGIN_RATE_LIMIT_PER_MIN', 5),
        'refresh_per_minute' => (int) env('REFRESH_RATE_LIMIT_PER_MIN', 30),
        'accept_invite_per_minute' => (int) env('ACCEPT_INVITE_RATE_LIMIT_PER_MIN', 10),
        'upload_per_minute' => (int) env('UPLOAD_RATE_LIMIT_PER_MIN', 10),
        'two_factor_verify_per_minute' => (int) env('TWO_FACTOR_VERIFY_RATE_LIMIT_PER_MIN', 10),
        'two_factor_resend_per_minute' => (int) env('TWO_FACTOR_RESEND_RATE_LIMIT_PER_MIN', 3),
    ],
];

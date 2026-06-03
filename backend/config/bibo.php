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
            'crm-attachments' => [
                'public' => false,
                'max_kb' => (int) env('BIBO_CRM_ATTACHMENT_MAX_KB', 10240),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
                'image_only' => false,
                'permissions' => [
                    'leads.view', 'leads.create', 'leads.update',
                    'site_visits.view', 'site_visits.execute',
                    'deal_payments.record',
                ],
            ],
            'procurement-attachments' => [
                'public' => false,
                'max_kb' => (int) env('BIBO_PROCUREMENT_ATTACHMENT_MAX_KB', 10240),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
                'image_only' => false,
                'permissions' => [
                    'procurement.view', 'procurement.manage',
                    'procurement.grn.view', 'procurement.grn.verify', 'procurement.grn.create',
                ],
            ],
            'project-documents' => [
                'public' => false,
                'max_kb' => (int) env('BIBO_PROJECT_DOCUMENT_MAX_KB', 10240),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf', 'csv', 'txt', 'json', 'xls', 'xlsx', 'dwg'],
                'image_only' => false,
                'permissions' => [
                    'projects.documents.view', 'projects.documents.upload',
                    'projects.bom.view', 'projects.bom.upload', 'projects.manage',
                ],
            ],
            'site-assessment' => [
                'public' => false,
                'max_kb' => (int) env('BIBO_SITE_ASSESSMENT_MAX_KB', 10240),
                'max_width' => (int) env('BIBO_SITE_ASSESSMENT_MAX_WIDTH', 4096),
                'max_height' => (int) env('BIBO_SITE_ASSESSMENT_MAX_HEIGHT', 4096),
                'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
                'image_only' => true,
                'permissions' => [
                    'projects.site_assessment_notes', 'projects.manage',
                ],
            ],
        ],
    ],

    'pm' => [
        'auto_assign_round_robin' => env('BIBO_PM_AUTO_ASSIGN_ROUND_ROBIN', false),
        'log_procurement_delay_on_shortage' => env('BIBO_PM_LOG_DELAY_ON_SHORTAGE', true),

        'stage_labels' => [
            'awaiting_deposit' => 'Awaiting deposit',
            'deposit_received' => 'Deposit received',
            'site_assessment' => 'Site assessment',
            'final_design_approval' => 'Final design approval',
            'bom_finalized' => 'BOM finalized',
            'material_check' => 'Material check',
            'materials_reserved' => 'Materials reserved',
            'awaiting_procurement' => 'Awaiting procurement',
            'materials_ready' => 'Materials ready',
            'cutting_stage' => 'Cutting',
            'fabrication_stage' => 'Fabrication',
            'glass_assembly' => 'Glass assembly',
            'qc_pre_installation' => 'QC pre-installation',
            'in_transit' => 'In transit',
            'installation' => 'Installation',
            'site_qc' => 'Site QC',
            'snagging' => 'Snagging',
            'project_complete' => 'Complete',
        ],

        'auto_stages' => [
            'material_check',
        ],

        'stage_waiting_messages' => [
            'material_check' => 'Waiting for warehouse to complete material check and reservation.',
            'materials_reserved' => 'Materials reserved — awaiting production start or warehouse release.',
            'awaiting_procurement' => 'Waiting for procurement to fulfill material shortages.',
        ],

        'stage_advance' => [
            [
                'permission' => 'projects.advance_stage',
                'transitions' => [
                    ['from' => 'awaiting_deposit', 'to' => ['deposit_received']],
                    ['from' => 'deposit_received', 'to' => ['site_assessment']],
                    ['from' => 'site_assessment', 'to' => ['final_design_approval']],
                    ['from' => 'final_design_approval', 'to' => ['bom_finalized']],
                    ['from' => 'qc_pre_installation', 'to' => ['in_transit', 'snagging']],
                    ['from' => 'in_transit', 'to' => ['installation']],
                    ['from' => 'installation', 'to' => ['site_qc', 'snagging']],
                    ['from' => 'site_qc', 'to' => ['snagging', 'project_complete']],
                    ['from' => 'snagging', 'to' => ['project_complete']],
                ],
            ],
            [
                'permission' => 'projects.advance_stage_sales',
                'transitions' => [
                    ['from' => 'awaiting_deposit', 'to' => ['deposit_received']],
                    ['from' => 'deposit_received', 'to' => ['site_assessment']],
                    ['from' => 'site_assessment', 'to' => ['final_design_approval']],
                ],
            ],
            [
                'permission' => 'projects.advance_stage_warehouse',
                'transitions' => [
                    ['from' => 'materials_reserved', 'to' => ['materials_ready']],
                    ['from' => 'awaiting_procurement', 'to' => ['materials_ready']],
                ],
            ],
            [
                'permission' => 'projects.advance_stage_production',
                'transitions' => [
                    ['from' => 'materials_ready', 'to' => ['cutting_stage']],
                    ['from' => 'cutting_stage', 'to' => ['fabrication_stage']],
                    ['from' => 'fabrication_stage', 'to' => ['glass_assembly']],
                    ['from' => 'glass_assembly', 'to' => ['qc_pre_installation']],
                ],
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

    'procurement' => [
        'supplier_code_prefix' => env('BIBO_SUPPLIER_CODE_PREFIX', 'SUP'),
        'supplier_code_pad' => (int) env('BIBO_SUPPLIER_CODE_PAD', 3),
        'supplier_category_code_pad' => (int) env('BIBO_SUPPLIER_CATEGORY_CODE_PAD', 2),
        'driver_code_prefix' => env('BIBO_DRIVER_CODE_PREFIX', 'DRV'),
        'driver_code_pad' => (int) env('BIBO_DRIVER_CODE_PAD', 3),
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

    /*
    | Default module demo users for local / staging (php artisan db:seed).
    | Email defaults to {module_key}@bibo.com when omitted.
    | Add a new entry here when a module is introduced — no seeder code changes needed.
    */
    'module_demo_users' => [
        'password' => env('MODULE_DEMO_PASSWORD', 'password123'),
        'users' => [
            'crm' => [
                'name' => 'CRM User',
                'department_slug' => 'sales_marketing',
                'role' => 'sales_representative',
            ],
            'projects' => [
                'name' => 'Projects User',
                'department_slug' => 'project_management',
                'role' => 'project_manager',
            ],
            'warehouse' => [
                'name' => 'Warehouse User',
                'department_slug' => 'warehouse',
                'role' => 'warehouse_manager_accessories',
            ],
            'procurement' => [
                'name' => 'Procurement User',
                'department_slug' => 'procurement',
                'role' => 'procurement_officer',
            ],
            'production' => [
                'name' => 'Production User',
                'department_slug' => 'production',
                'role' => 'production_manager',
            ],
            'qc' => [
                'name' => 'QC User',
                'department_slug' => 'quality_control',
                'role' => 'qc_inspector',
            ],
            'finance' => [
                'name' => 'Finance User',
                'department_slug' => 'finance',
                'role' => 'finance_officer',
            ],
            'hr' => [
                'name' => 'HR User',
                'department_slug' => 'hr',
                'role' => 'hr_manager',
            ],
            'it' => [
                'name' => 'IT User',
                'department_slug' => 'it',
                'role' => 'it_admin',
            ],
        ],
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

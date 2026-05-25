<?php

namespace App\Enums;

enum AuditAction: string
{
    case Create = 'create';
    case Update = 'update';
    case Delete = 'delete';
    case View = 'view';
    case Login = 'login';
    case Logout = 'logout';
    case Export = 'export';
}

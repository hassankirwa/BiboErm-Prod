<?php

namespace App\Enums\FieldInstallation;

enum FieldUnitStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Installed = 'installed';
    case Snagged = 'snagged';
    case Waived = 'waived';
}

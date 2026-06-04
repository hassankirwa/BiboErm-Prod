<?php

namespace App\Enums\FieldInstallation;

enum FieldJobStatus: string
{
    case Scheduled = 'scheduled';
    case InProgress = 'in_progress';
    case OnHold = 'on_hold';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function isActive(): bool
    {
        return in_array($this, [self::Scheduled, self::InProgress, self::OnHold], true);
    }
}

<?php

namespace App\Enums\Production;

enum ProductionOrderStatus: string
{
    case Scheduled = 'scheduled';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case OnHold = 'on_hold';

    /**
     * @return list<string>
     */
    public static function activeValues(): array
    {
        return [
            self::Scheduled->value,
            self::InProgress->value,
        ];
    }
}

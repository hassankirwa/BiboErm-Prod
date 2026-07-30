<?php

namespace App\Enums\Projects;

enum DesignChangeOrderStatus: string
{
    case Drafted = 'drafted';
    case AwaitingRemeasure = 'awaiting_remeasure';
    case DesignInProgress = 'design_in_progress';
    case BomRevised = 'bom_revised';
    case MaterialsReady = 'materials_ready';
    case RemakeInProduction = 'remake_in_production';
    case Closed = 'closed';
    case Cancelled = 'cancelled';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Closed, self::Cancelled], true);
    }
}

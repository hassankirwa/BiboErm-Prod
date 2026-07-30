<?php

namespace App\Enums\Warehouse;

enum ToolIncidentStatus: string
{
    case Open = 'open';
    case InRepair = 'in_repair';
    case Repaired = 'repaired';
    case Replaced = 'replaced';
    case WrittenOff = 'written_off';

    public function isTerminal(): bool
    {
        return in_array($this, [self::Repaired, self::Replaced, self::WrittenOff], true);
    }
}

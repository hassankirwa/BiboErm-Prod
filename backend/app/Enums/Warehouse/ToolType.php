<?php

namespace App\Enums\Warehouse;

enum ToolType: string
{
    case HandTool = 'hand_tool';
    case PowerTool = 'power_tool';
    case Cutting = 'cutting';
    case Fabrication = 'fabrication';
    case Measuring = 'measuring';
    case Safety = 'safety';
    case Consumable = 'consumable';
    case Fastener = 'fastener';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::HandTool => 'Hand tool',
            self::PowerTool => 'Power tool',
            self::Cutting => 'Cutting',
            self::Fabrication => 'Fabrication',
            self::Measuring => 'Measuring',
            self::Safety => 'Safety / PPE',
            self::Consumable => 'Consumable',
            self::Fastener => 'Fastener (nails, screws…)',
            self::Other => 'Other',
        };
    }

    public function defaultReturnable(): bool
    {
        return match ($this) {
            self::Consumable, self::Fastener => false,
            default => true,
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function tryFromLoose(?string $value): ?self
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $normalized = strtolower(trim(str_replace([' ', '-'], '_', $value)));

        return self::tryFrom($normalized) ?? match ($normalized) {
            'ppe', 'safety_ppe' => self::Safety,
            'nails', 'screws', 'fasteners' => self::Fastener,
            'consumables' => self::Consumable,
            default => null,
        };
    }
}

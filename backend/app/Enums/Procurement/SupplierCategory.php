<?php

namespace App\Enums\Procurement;

enum SupplierCategory: string
{
    case Profiles = 'profiles';
    case Accessories = 'accessories';
    case Rubbers = 'rubbers';
    case Glass = 'glass';
    case General = 'general';
    case Logistics = 'logistics';

    public function label(): string
    {
        return match ($this) {
            self::Profiles => 'Aluminium Profiles',
            self::Accessories => 'Accessories',
            self::Rubbers => 'Rubbers',
            self::Glass => 'Glass',
            self::General => 'General',
            self::Logistics => 'Logistics',
        };
    }

    /** Short segment used in supplier codes, e.g. SUP-ALU-01. */
    public function codePrefix(): string
    {
        return match ($this) {
            self::Profiles => 'ALU',
            self::Accessories => 'ACC',
            self::Rubbers => 'RUB',
            self::Glass => 'GLS',
            self::General => 'GEN',
            self::Logistics => 'LOG',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case) => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}

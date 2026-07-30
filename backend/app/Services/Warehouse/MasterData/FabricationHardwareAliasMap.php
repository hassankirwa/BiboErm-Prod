<?php

namespace App\Services\Warehouse\MasterData;

/**
 * Known Wincad fabrication hardware names mapped to warehouse SKU hints for alias seeding.
 *
 * @return array<string, array{sku: string, name: string}>
 */
class FabricationHardwareAliasMap
{
    public static function entries(): array
    {
        return [
            'Roller 90 SD' => ['sku' => 'ROLLER-90-SD', 'name' => 'Roller 90 SD'],
            'Lock 90 SD' => ['sku' => 'LOCK-90-SD', 'name' => 'Lock 90 SD'],
            'Cilicom玻璃胶' => ['sku' => 'CILICOM-GLASS-GLUE', 'name' => 'Cilicom Glass Glue'],
        ];
    }

    /**
     * @return array{sku: string, name: string}|null
     */
    public static function resolve(string $fabricationName): ?array
    {
        $normalized = mb_strtolower(trim($fabricationName));

        foreach (self::entries() as $sourceName => $target) {
            if (mb_strtolower($sourceName) === $normalized) {
                return $target;
            }
        }

        return null;
    }
}

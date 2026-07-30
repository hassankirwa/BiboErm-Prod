<?php

namespace App\Console\Commands;

use App\Models\Warehouse\DoorType;
use Illuminate\Console\Command;

class DeactivateSeededDoorTypesCommand extends Command
{
    protected $signature = 'warehouse:deactivate-seeded-door-types
                            {--dry-run : Show which codes would be deactivated}';

    protected $description = 'Deactivate demo door types (SLD, FLD, CSM, BTH, AWN) left from structure seeding; keeps GEN';

    /** @var list<string> */
    protected array $seededProductCodes = ['SLD', 'FLD', 'CSM', 'BTH', 'AWN'];

    public function handle(): int
    {
        $query = DoorType::query()->whereIn('code', $this->seededProductCodes);
        $codes = $query->pluck('code')->all();

        if ($codes === []) {
            $this->info('No seeded product door types found.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->comment('Would deactivate: '.implode(', ', $codes));

            return self::SUCCESS;
        }

        $updated = DoorType::query()
            ->whereIn('code', $this->seededProductCodes)
            ->update(['is_active' => false]);

        $this->info("Deactivated {$updated} door type(s): ".implode(', ', $codes));

        return self::SUCCESS;
    }
}

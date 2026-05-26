<?php

use Database\Seeders\CrmLookupSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * CRM lookup tables are required reference data (lead sources, types, etc.).
     * Migrations create the tables but do not populate them; seed here so
     * `php artisan migrate` alone is enough for dropdowns to work.
     */
    public function up(): void
    {
        (new CrmLookupSeeder)->run();
    }

    public function down(): void
    {
        // Reference data is left in place on rollback (same as CrmLookupSeeder).
    }
};

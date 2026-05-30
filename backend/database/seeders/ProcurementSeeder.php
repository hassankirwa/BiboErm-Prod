<?php

namespace Database\Seeders;

use App\Models\Procurement\Supplier;
use Illuminate\Database\Seeder;

class ProcurementSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['code' => 'SUP-ALU-01', 'name' => 'Aluminium Profiles Ltd', 'category' => 'profiles', 'is_preferred' => true],
            ['code' => 'SUP-ACC-01', 'name' => 'Accessories Kenya', 'category' => 'accessories', 'is_preferred' => true],
            ['code' => 'SUP-GLS-01', 'name' => 'Nairobi Glass Works', 'category' => 'glass', 'is_preferred' => true],
            ['code' => 'SUP-GEN-01', 'name' => 'General Hardware Supplies', 'category' => 'general', 'is_preferred' => false],
        ];

        foreach ($suppliers as $data) {
            Supplier::query()->firstOrCreate(['code' => $data['code']], $data);
        }
    }
}

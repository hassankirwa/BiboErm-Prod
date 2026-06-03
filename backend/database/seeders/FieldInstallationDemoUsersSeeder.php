<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class FieldInstallationDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ModuleDemoUsersSeeder::class);
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('install_mode', 40)->default('nairobi_site_install')->after('location_type');
        });

        if (Schema::hasTable('projects')) {
            DB::table('projects')->where('type', 'fabrication_only')->update([
                'install_mode' => 'nairobi_fabrication_only',
            ]);

            DB::table('projects')->where('location_type', 'outside_nairobi')->update([
                'install_mode' => 'outside_full_install',
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('install_mode');
        });
    }
};

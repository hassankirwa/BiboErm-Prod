<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_non_conformities', function (Blueprint $table) {
            if (! Schema::hasColumn('field_non_conformities', 'field_installation_unit_id')) {
                $table->foreignId('field_installation_unit_id')
                    ->nullable()
                    ->after('job_id')
                    ->constrained('field_installation_units')
                    ->nullOnDelete();
            }
        });

        Schema::table('design_change_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('design_change_orders', 'field_installation_unit_id')) {
                $table->foreignId('field_installation_unit_id')
                    ->nullable()
                    ->after('field_non_conformity_id')
                    ->constrained('field_installation_units')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('design_change_orders', function (Blueprint $table) {
            if (Schema::hasColumn('design_change_orders', 'field_installation_unit_id')) {
                $table->dropConstrainedForeignId('field_installation_unit_id');
            }
        });

        Schema::table('field_non_conformities', function (Blueprint $table) {
            if (Schema::hasColumn('field_non_conformities', 'field_installation_unit_id')) {
                $table->dropConstrainedForeignId('field_installation_unit_id');
            }
        });
    }
};

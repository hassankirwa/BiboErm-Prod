<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_bom_lines', function (Blueprint $table) {
            $table->string('unit_of_measure', 32)->nullable()->after('measurement_mm');
            $table->unsignedInteger('width_mm')->nullable()->after('unit_of_measure');
            $table->unsignedInteger('height_mm')->nullable()->after('width_mm');
            $table->string('opening_code', 64)->nullable()->after('height_mm');
            $table->string('source_system', 32)->nullable()->after('opening_code');
            $table->string('series', 120)->nullable()->after('source_system');
            $table->unsignedInteger('bars_needed')->nullable()->after('series');
            $table->decimal('reserve_qty', 12, 3)->nullable()->after('bars_needed');
            $table->string('reserve_uom', 16)->nullable()->after('reserve_qty');
        });
    }

    public function down(): void
    {
        Schema::table('project_bom_lines', function (Blueprint $table) {
            $table->dropColumn([
                'unit_of_measure',
                'width_mm',
                'height_mm',
                'opening_code',
                'source_system',
                'series',
                'bars_needed',
                'reserve_qty',
                'reserve_uom',
            ]);
        });
    }
};

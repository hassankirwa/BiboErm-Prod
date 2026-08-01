<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_installation_units', function (Blueprint $table) {
            $table->string('measurement_line_key')->nullable()->after('project_bom_line_id');
            $table->string('opening_ref')->nullable()->after('measurement_line_key');
            $table->string('product_type')->nullable()->after('opening_ref');
            $table->string('unit_floor')->nullable()->after('product_type');
            $table->string('room_location')->nullable()->after('unit_floor');
            $table->unsignedInteger('quantity')->default(1)->after('room_location');
            $table->json('measurement_snapshot')->nullable()->after('quantity');
            $table->text('misfit_notes')->nullable()->after('snag_notes');

            $table->unique(['job_id', 'measurement_line_key'], 'field_units_job_measurement_line_unique');
        });
    }

    public function down(): void
    {
        Schema::table('field_installation_units', function (Blueprint $table) {
            $table->dropUnique('field_units_job_measurement_line_unique');
            $table->dropColumn([
                'measurement_line_key',
                'opening_ref',
                'product_type',
                'unit_floor',
                'room_location',
                'quantity',
                'measurement_snapshot',
                'misfit_notes',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_visits', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('account_id')->constrained('projects')->nullOnDelete();
            $table->string('measurement_context', 20)->default('quotation')->after('visit_purpose');
            $table->json('measurement_form_data')->nullable()->after('field_officer_notes');
            $table->string('measurement_form_status', 20)->default('draft')->after('measurement_form_data');
            $table->string('rough_sketch_path')->nullable()->after('measurement_form_status');
        });
    }

    public function down(): void
    {
        Schema::table('site_visits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
            $table->dropColumn([
                'measurement_context',
                'measurement_form_data',
                'measurement_form_status',
                'rough_sketch_path',
            ]);
        });
    }
};

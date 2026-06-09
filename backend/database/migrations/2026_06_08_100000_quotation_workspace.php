<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('project_name')->nullable()->after('quotation_number');
            $table->string('project_number', 50)->nullable()->after('project_name');
            $table->string('source_excel_path', 500)->nullable()->after('terms_conditions');
            $table->decimal('tax_rate', 5, 2)->default(16)->after('tax_amount');
        });

        Schema::table('quotation_lines', function (Blueprint $table) {
            $table->string('series', 120)->nullable()->after('description');
            $table->string('code', 50)->nullable()->after('series');
            $table->string('glass_type', 255)->nullable()->after('code');
            $table->decimal('width_mm', 10, 2)->nullable()->after('glass_type');
            $table->decimal('height_mm', 10, 2)->nullable()->after('width_mm');
            $table->decimal('sqm_per_pcs', 10, 4)->nullable()->after('height_mm');
            $table->decimal('total_sqm', 10, 4)->nullable()->after('sqm_per_pcs');
            $table->json('metadata')->nullable()->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_lines', function (Blueprint $table) {
            $table->dropColumn([
                'series', 'code', 'glass_type', 'width_mm', 'height_mm',
                'sqm_per_pcs', 'total_sqm', 'metadata',
            ]);
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn([
                'project_name', 'project_number', 'source_excel_path', 'tax_rate',
            ]);
        });
    }
};

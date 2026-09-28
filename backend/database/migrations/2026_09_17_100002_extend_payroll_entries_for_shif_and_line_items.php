<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->decimal('additions_total', 12, 2)->default(0)->after('gross_salary');
            $table->decimal('shif', 12, 2)->default(0)->after('additions_total');
            $table->json('line_items')->nullable()->after('other_deductions');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->dropColumn(['shif', 'additions_total', 'line_items']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('nssf_tier1_cap', 12, 2)->default(7000);
            $table->decimal('nssf_tier2_cap', 12, 2)->default(36000);
            $table->decimal('nssf_rate', 8, 4)->default(0.06);
            $table->decimal('personal_relief', 12, 2)->default(2400);
            $table->json('paye_bands')->nullable();
            $table->timestamps();
        });

        Schema::create('payroll_deduction_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('method', 40);
            $table->decimal('rate', 8, 4)->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->boolean('tax_deductible')->default(false);
            $table->boolean('enabled')->default(true);
            $table->boolean('is_system')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_deduction_types');
        Schema::dropIfExists('payroll_settings');
    }
};

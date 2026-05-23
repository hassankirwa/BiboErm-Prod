<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('employee_number', 50)->nullable()->unique();
            $table->string('job_title')->nullable();
            $table->string('employment_type', 50)->nullable();
            $table->date('start_date')->nullable();
            $table->string('salary_grade', 50)->nullable();
            $table->foreignId('reporting_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('work_location')->nullable();
            $table->string('contract_type', 50)->nullable();
            $table->date('contract_end_date')->nullable();
            $table->text('hr_notes')->nullable();
            $table->timestamps();
            $table->index('employee_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_profiles');
    }
};

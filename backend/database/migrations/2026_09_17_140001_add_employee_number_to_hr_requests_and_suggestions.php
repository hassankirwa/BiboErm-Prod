<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_requests', function (Blueprint $table) {
            $table->string('employee_number', 50)->nullable()->after('user_id');
            $table->index('employee_number');
        });

        Schema::table('hr_suggestions', function (Blueprint $table) {
            $table->string('employee_number', 50)->nullable()->after('user_id');
            $table->index('employee_number');
        });
    }

    public function down(): void
    {
        Schema::table('hr_requests', function (Blueprint $table) {
            $table->dropIndex(['employee_number']);
            $table->dropColumn('employee_number');
        });

        Schema::table('hr_suggestions', function (Blueprint $table) {
            $table->dropIndex(['employee_number']);
            $table->dropColumn('employee_number');
        });
    }
};

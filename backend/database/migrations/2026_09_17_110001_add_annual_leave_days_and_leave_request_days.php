<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('annual_leave_days')->default(21)->after('personal_relief');
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->unsignedSmallInteger('days')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_settings', function (Blueprint $table) {
            $table->dropColumn('annual_leave_days');
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn('days');
        });
    }
};

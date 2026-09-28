<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->string('unit', 150)->nullable()->after('job_title');
            $table->string('department_email', 255)->nullable()->after('work_location');
            $table->string('national_id', 50)->nullable()->after('department_email');
            $table->string('kra_pin', 50)->nullable()->after('national_id');
            $table->string('nssf_number', 50)->nullable()->after('kra_pin');
            $table->string('shif_number', 50)->nullable()->after('nssf_number');
            $table->string('bank_or_mpesa', 255)->nullable()->after('shif_number');
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('phone_alt', 50)->nullable()->after('phone');
            $table->string('home_county', 100)->nullable()->after('address');
            $table->string('home_area', 150)->nullable()->after('home_county');
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'unit',
                'department_email',
                'national_id',
                'kra_pin',
                'nssf_number',
                'shif_number',
                'bank_or_mpesa',
            ]);
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['phone_alt', 'home_county', 'home_area']);
        });
    }
};

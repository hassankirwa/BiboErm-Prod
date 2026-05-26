<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_days', function (Blueprint $table) {
            $table->unique(['field_date', 'field_officer_id'], 'field_days_officer_date_unique');
        });

        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->text('findings')->nullable()->after('notes');
            $table->string('site_label', 255)->nullable()->after('findings');
            $table->foreignId('county_id')->nullable()->after('site_label')->constrained('crm_counties')->nullOnDelete();
            $table->string('subcounty', 100)->nullable()->after('county_id');
            $table->string('ward', 100)->nullable()->after('subcounty');
        });
    }

    public function down(): void
    {
        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->dropConstrainedForeignId('county_id');
            $table->dropColumn(['findings', 'site_label', 'subcounty', 'ward']);
        });

        Schema::table('field_days', function (Blueprint $table) {
            $table->dropUnique('field_days_officer_date_unique');
        });
    }
};

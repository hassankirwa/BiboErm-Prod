<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->text('location_address')->nullable()->after('ward');
        });
    }

    public function down(): void
    {
        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->dropColumn('location_address');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->unsignedSmallInteger('accuracy_m')->nullable()->after('longitude');
            $table->timestamp('captured_at')->nullable()->after('accuracy_m');
        });
    }

    public function down(): void
    {
        Schema::table('field_day_pins', function (Blueprint $table) {
            $table->dropColumn(['accuracy_m', 'captured_at']);
        });
    }
};

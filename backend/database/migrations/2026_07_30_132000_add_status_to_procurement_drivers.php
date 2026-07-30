<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procurement_drivers', function (Blueprint $table) {
            $table->string('status', 32)->default('available')->after('is_active');
            $table->index('status');
        });

        DB::table('procurement_drivers')
            ->where('is_active', true)
            ->update(['status' => 'available']);

        DB::table('procurement_drivers')
            ->where('is_active', false)
            ->update(['status' => 'inactive']);
    }

    public function down(): void
    {
        Schema::table('procurement_drivers', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn('status');
        });
    }
};

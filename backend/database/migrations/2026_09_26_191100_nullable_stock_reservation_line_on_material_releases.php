<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_material_releases', function (Blueprint $table) {
            $table->unsignedBigInteger('stock_reservation_line_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('production_material_releases', function (Blueprint $table) {
            $table->unsignedBigInteger('stock_reservation_line_id')->nullable(false)->change();
        });
    }
};

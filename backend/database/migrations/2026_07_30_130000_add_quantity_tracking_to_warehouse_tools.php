<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_tools', function (Blueprint $table) {
            $table->string('tracking_mode', 20)->default('serialized')->after('is_active');
            $table->unsignedInteger('total_qty')->default(1)->after('tracking_mode');
            $table->unsignedInteger('qty_in_repair')->default(0)->after('total_qty');
        });

        Schema::table('tool_issuances', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1)->after('issued_by');
        });
    }

    public function down(): void
    {
        Schema::table('tool_issuances', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });

        Schema::table('warehouse_tools', function (Blueprint $table) {
            $table->dropColumn(['tracking_mode', 'total_qty', 'qty_in_repair']);
        });
    }
};

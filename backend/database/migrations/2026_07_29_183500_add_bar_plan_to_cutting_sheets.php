<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cutting_sheets', function (Blueprint $table) {
            $table->unsignedInteger('bar_number')->default(1)->after('warehouse_item_id');
            $table->json('cuts')->nullable()->after('pieces');
            $table->unsignedInteger('planned_used_mm')->nullable()->after('cuts');
            $table->unsignedInteger('planned_waste_mm')->nullable()->after('planned_used_mm');

            $table->index(
                ['production_order_id', 'warehouse_item_id', 'bar_number'],
                'cutting_sheets_order_item_bar_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('cutting_sheets', function (Blueprint $table) {
            $table->dropIndex('cutting_sheets_order_item_bar_index');
            $table->dropColumn([
                'bar_number',
                'cuts',
                'planned_used_mm',
                'planned_waste_mm',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_bom_lines') && Schema::hasTable('warehouse_items') && Schema::hasColumn('project_bom_lines', 'warehouse_item_id')) {
            Schema::table('project_bom_lines', function (Blueprint $table) {
                $table->foreign('warehouse_item_id')
                    ->references('id')
                    ->on('warehouse_items')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('purchase_requisition_lines') && Schema::hasTable('project_bom_lines') && Schema::hasColumn('purchase_requisition_lines', 'project_bom_line_id')) {
            Schema::table('purchase_requisition_lines', function (Blueprint $table) {
                $table->foreign('project_bom_line_id')
                    ->references('id')
                    ->on('project_bom_lines')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('purchase_requisition_lines') && Schema::hasColumn('purchase_requisition_lines', 'project_bom_line_id')) {
            Schema::table('purchase_requisition_lines', function (Blueprint $table) {
                $table->dropForeign(['project_bom_line_id']);
            });
        }

        if (Schema::hasTable('project_bom_lines') && Schema::hasColumn('project_bom_lines', 'warehouse_item_id')) {
            Schema::table('project_bom_lines', function (Blueprint $table) {
                $table->dropForeign(['warehouse_item_id']);
            });
        }
    }
};

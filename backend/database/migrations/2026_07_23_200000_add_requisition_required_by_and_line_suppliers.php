<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_requisitions', 'required_by')) {
                $table->date('required_by')->nullable()->after('notes');
            }
        });

        Schema::table('purchase_requisition_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_requisition_lines', 'preferred_supplier_id')) {
                $table->foreignId('preferred_supplier_id')
                    ->nullable()
                    ->after('notes')
                    ->constrained('suppliers')
                    ->nullOnDelete();
            }
        });

        Schema::table('purchase_order_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_order_lines', 'requisition_line_id')) {
                $table->foreignId('requisition_line_id')
                    ->nullable()
                    ->after('warehouse_item_id')
                    ->constrained('purchase_requisition_lines')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_lines', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order_lines', 'requisition_line_id')) {
                $table->dropConstrainedForeignId('requisition_line_id');
            }
        });

        Schema::table('purchase_requisition_lines', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_requisition_lines', 'preferred_supplier_id')) {
                $table->dropConstrainedForeignId('preferred_supplier_id');
            }
        });

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_requisitions', 'required_by')) {
                $table->dropColumn('required_by');
            }
        });
    }
};

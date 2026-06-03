<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->foreignId('supplier_id')
                ->nullable()
                ->after('project_id')
                ->constrained('suppliers')
                ->nullOnDelete();
        });

        Schema::table('purchase_requisition_lines', function (Blueprint $table) {
            $table->decimal('required_quantity', 15, 3)
                ->nullable()
                ->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requisition_lines', function (Blueprint $table) {
            $table->dropColumn('required_quantity');
        });

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
        });
    }
};

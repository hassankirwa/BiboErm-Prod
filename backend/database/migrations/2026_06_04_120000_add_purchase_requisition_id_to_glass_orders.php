<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('glass_orders', function (Blueprint $table) {
            $table->foreignId('purchase_requisition_id')
                ->nullable()
                ->after('purchase_order_id')
                ->constrained('purchase_requisitions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('glass_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('purchase_requisition_id');
        });
    }
};

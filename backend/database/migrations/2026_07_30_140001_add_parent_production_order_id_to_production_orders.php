<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('production_orders', 'parent_production_order_id')) {
                $table->foreignId('parent_production_order_id')
                    ->nullable()
                    ->after('project_id')
                    ->constrained('production_orders')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('production_orders', function (Blueprint $table) {
            if (Schema::hasColumn('production_orders', 'parent_production_order_id')) {
                $table->dropConstrainedForeignId('parent_production_order_id');
            }
        });
    }
};

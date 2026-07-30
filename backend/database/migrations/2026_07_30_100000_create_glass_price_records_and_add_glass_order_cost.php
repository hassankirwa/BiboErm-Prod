<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('glass_orders', function (Blueprint $table) {
            $table->decimal('total_cost', 14, 2)->nullable()->after('notes');
            $table->decimal('total_area_m2', 14, 4)->nullable()->after('total_cost');
            $table->string('currency', 3)->default('KES')->after('total_area_m2');
        });

        Schema::create('glass_price_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('glass_order_id')->constrained('glass_orders')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->unsignedInteger('pane_index');
            $table->string('pane_name')->nullable();
            $table->string('glass_type')->nullable();
            $table->string('tint')->nullable();
            $table->decimal('width_mm', 12, 2);
            $table->decimal('height_mm', 12, 2);
            $table->decimal('quantity', 12, 3);
            $table->decimal('area_m2', 14, 6);
            $table->decimal('buying_price', 14, 2);
            $table->decimal('price_per_sqm', 14, 4);
            $table->string('currency', 3)->default('KES');
            $table->timestamp('recorded_at');
            $table->timestamps();

            $table->index(['glass_type', 'recorded_at']);
            $table->index(['recorded_at']);
            $table->index(['supplier_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('glass_price_records');

        Schema::table('glass_orders', function (Blueprint $table) {
            $table->dropColumn(['total_cost', 'total_area_m2', 'currency']);
        });
    }
};

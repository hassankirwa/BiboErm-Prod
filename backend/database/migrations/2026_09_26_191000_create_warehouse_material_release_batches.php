<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_material_release_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->restrictOnDelete();
            $table->foreignId('stock_reservation_id')->constrained('stock_reservations')->restrictOnDelete();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('released_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->boolean('is_partial')->default(true);
            $table->timestamp('released_at');
            $table->timestamps();

            $table->index(['project_id', 'released_at']);
        });

        Schema::create('warehouse_material_release_batch_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('warehouse_material_release_batches')->cascadeOnDelete();
            $table->foreignId('stock_reservation_line_id')->nullable()->constrained('stock_reservation_lines')->nullOnDelete();
            $table->foreignId('item_id')->constrained('warehouse_items')->restrictOnDelete();
            $table->foreignId('bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->decimal('quantity', 12, 3);
            $table->timestamps();

            $table->index('item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_material_release_batch_lines');
        Schema::dropIfExists('warehouse_material_release_batches');
    }
};

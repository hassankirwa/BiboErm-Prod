<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_material_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->restrictOnDelete();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->string('source', 30);
            $table->string('status', 30)->default('pending');
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('fulfilled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fulfilled_at')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('purchase_requisition_id')->nullable()->constrained('purchase_requisitions')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'project_id']);
            $table->index('source');
        });

        Schema::create('warehouse_material_request_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_request_id')->constrained('warehouse_material_requests')->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained('warehouse_items')->restrictOnDelete();
            $table->decimal('quantity_requested', 12, 3);
            $table->decimal('quantity_fulfilled', 12, 3)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('warehouse_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_material_request_lines');
        Schema::dropIfExists('warehouse_material_requests');
    }
};

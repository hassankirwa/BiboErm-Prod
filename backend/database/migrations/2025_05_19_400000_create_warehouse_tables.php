<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category', 32);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('warehouse_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->timestamps();

            $table->unique(['warehouse_id', 'code']);
        });

        Schema::create('warehouse_bins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('warehouse_sections')->cascadeOnDelete();
            $table->string('code');
            $table->string('name')->nullable();
            $table->timestamps();

            $table->unique(['section_id', 'code']);
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('category', 64);
            $table->string('unit', 32)->default('pcs');
            $table->decimal('reorder_level', 14, 3)->default(0);
            $table->decimal('quantity_on_hand', 14, 3)->default(0);
            $table->decimal('quantity_reserved', 14, 3)->default(0);
            $table->foreignId('bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->decimal('quantity', 14, 3);
            $table->string('reference')->nullable();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 14, 3);
            $table->string('status', 32)->default('reserved');
            $table->unsignedInteger('fifo_position')->default(0);
            $table->timestamp('reserved_at');
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });

        Schema::create('offcuts', function (Blueprint $table) {
            $table->id();
            $table->string('profile_code')->nullable();
            $table->decimal('length_mm', 12, 2);
            $table->decimal('quantity', 14, 3)->default(1);
            $table->string('status', 32)->default('available');
            $table->foreignId('source_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('allocated_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offcuts');
        Schema::dropIfExists('stock_reservations');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('warehouse_bins');
        Schema::dropIfExists('warehouse_sections');
        Schema::dropIfExists('warehouses');
    }
};

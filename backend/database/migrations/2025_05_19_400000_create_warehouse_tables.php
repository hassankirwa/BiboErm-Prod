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
            $table->string('code', 30)->unique();
            $table->string('name');
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('door_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('section_code', 30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('warehouse_decks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 30);
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['warehouse_id', 'slug']);
            $table->index('warehouse_id');
        });

        Schema::create('warehouse_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deck_id')->constrained('warehouse_decks')->cascadeOnDelete();
            $table->foreignId('door_type_id')->nullable()->constrained('door_types')->nullOnDelete();
            $table->string('code', 30);
            $table->string('name');
            $table->string('section_type', 50);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['deck_id', 'code']);
            $table->index('door_type_id');
            $table->index('section_type');
        });

        Schema::create('warehouse_bins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('warehouse_sections')->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['section_id', 'code']);
            $table->index('section_id');
        });

        Schema::create('warehouse_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 50)->unique();
            $table->string('name');
            $table->string('category', 30);
            $table->string('unit_of_measure', 20);
            $table->foreignId('door_type_id')->nullable()->constrained('door_types')->nullOnDelete();
            $table->decimal('min_stock_qty', 15, 3)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->index('door_type_id');
            $table->index('is_active');
        });

        Schema::create('aluminium_profiles', function (Blueprint $table) {
            $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
            $table->string('profile_family', 100);
            $table->decimal('width_mm', 10, 2)->nullable();
            $table->decimal('depth_mm', 10, 2)->nullable();
            $table->string('finish', 100)->nullable();
            $table->decimal('weight_per_metre', 10, 4)->nullable();
            $table->integer('standard_bar_length_mm')->nullable();
        });

        Schema::create('accessories', function (Blueprint $table) {
            $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
            $table->foreignId('door_type_id')->constrained('door_types')->restrictOnDelete();
            $table->foreignId('default_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();

            $table->index('door_type_id');
            $table->index('default_bin_id');
        });

        Schema::create('rubbers', function (Blueprint $table) {
            $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
            $table->json('compatible_profile_ids')->nullable();
            $table->foreignId('default_section_id')->nullable()->constrained('warehouse_sections')->nullOnDelete();

            $table->index('default_section_id');
        });

        Schema::create('door_type_accessories', function (Blueprint $table) {
            $table->foreignId('door_type_id')->constrained('door_types')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('warehouse_items')->cascadeOnDelete();
            $table->decimal('standard_qty', 10, 2)->default(1);

            $table->primary(['door_type_id', 'item_id']);
        });

        Schema::create('stock_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('warehouse_items')->cascadeOnDelete();
            $table->foreignId('bin_id')->constrained('warehouse_bins')->cascadeOnDelete();
            $table->decimal('quantity_on_hand', 15, 3)->default(0);
            $table->decimal('quantity_reserved', 15, 3)->default(0);
            $table->timestamp('updated_at');

            $table->unique(['item_id', 'bin_id']);
            $table->index('bin_id');
            $table->index('item_id');
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('movement_number', 30)->unique();
            $table->string('movement_type', 30);
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('performed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('performed_at');
            $table->timestamp('created_at');

            $table->index('movement_type');
            $table->index(['reference_type', 'reference_id']);
            $table->index('performed_at');
            $table->index('performed_by');
        });

        Schema::create('stock_movement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_movement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('warehouse_items')->restrictOnDelete();
            $table->foreignId('from_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->foreignId('to_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_cost', 15, 2)->nullable();

            $table->index('stock_movement_id');
            $table->index('item_id');
            $table->index('to_bin_id');
            $table->index('from_bin_id');
        });

        Schema::create('stock_reservations', function (Blueprint $table) {
            $table->id();
            $table->string('reservation_number', 30)->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('pending');
            $table->timestamp('reserved_at');
            $table->foreignId('reserved_by')->constrained('users')->restrictOnDelete();
            $table->integer('fifo_sequence');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('project_id');
            $table->index('status');
            $table->index('fifo_sequence');
        });

        Schema::create('stock_reservation_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('stock_reservations')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('warehouse_items')->restrictOnDelete();
            $table->foreignId('bin_id')->constrained('warehouse_bins')->restrictOnDelete();
            $table->decimal('quantity_reserved', 15, 3);
            $table->decimal('quantity_released', 15, 3)->default(0);
            $table->string('bom_line_ref', 100)->nullable();

            $table->index('reservation_id');
            $table->index('item_id');
            $table->index('bin_id');
        });

        Schema::create('offcut_pieces', function (Blueprint $table) {
            $table->id();
            $table->string('offcut_number', 30)->unique();
            $table->foreignId('item_id')->constrained('warehouse_items')->restrictOnDelete();
            $table->foreignId('bin_id')->constrained('warehouse_bins')->restrictOnDelete();
            $table->integer('length_mm');
            $table->integer('quantity_pieces')->default(1);
            $table->foreignId('source_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('source_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->string('status', 30)->default('available');
            $table->foreignId('allocated_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('logged_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('logged_at');
            $table->text('notes')->nullable();
            $table->timestamp('created_at');

            $table->index(['item_id', 'length_mm', 'status']);
            $table->index('bin_id');
            $table->index('allocated_project_id');
            $table->index('source_project_id');
        });

        Schema::create('warehouse_tools', function (Blueprint $table) {
            $table->id();
            $table->string('tool_code', 30)->unique();
            $table->string('name');
            $table->string('tool_type', 100)->nullable();
            $table->string('condition', 30)->default('good');
            $table->date('purchase_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index('condition');
        });

        Schema::create('tool_issuances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tool_id')->constrained('warehouse_tools')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('issued_to')->constrained('users')->restrictOnDelete();
            $table->foreignId('issued_by')->constrained('users')->restrictOnDelete();
            $table->date('issue_date');
            $table->date('return_date')->nullable();
            $table->string('condition_out', 30);
            $table->string('condition_in', 30)->nullable();
            $table->text('damage_notes')->nullable();
            $table->timestamp('created_at');

            $table->index('tool_id');
            $table->index('project_id');
            $table->index('issued_to');
            $table->index('return_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tool_issuances');
        Schema::dropIfExists('warehouse_tools');
        Schema::dropIfExists('offcut_pieces');
        Schema::dropIfExists('stock_reservation_lines');
        Schema::dropIfExists('stock_reservations');
        Schema::dropIfExists('stock_movement_lines');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_levels');
        Schema::dropIfExists('door_type_accessories');
        Schema::dropIfExists('rubbers');
        Schema::dropIfExists('accessories');
        Schema::dropIfExists('aluminium_profiles');
        Schema::dropIfExists('warehouse_items');
        Schema::dropIfExists('warehouse_bins');
        Schema::dropIfExists('warehouse_sections');
        Schema::dropIfExists('warehouse_decks');
        Schema::dropIfExists('door_types');
        Schema::dropIfExists('warehouses');
    }
};

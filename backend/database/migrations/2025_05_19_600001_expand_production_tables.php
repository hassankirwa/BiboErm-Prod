<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_order_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 64);
            $table->string('role', 50);
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['production_order_id', 'user_id', 'stage']);
            $table->index(['production_order_id', 'stage']);
        });

        Schema::create('production_material_releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('stock_reservation_line_id');
            $table->string('stage', 64);
            $table->decimal('qty_released', 15, 3);
            $table->timestamp('released_at');
            $table->foreignId('released_by')->constrained('users');
            $table->unsignedBigInteger('stock_movement_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at');

            $table->index(['production_order_id', 'stage']);
        });

        Schema::create('cutting_sheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('project_bom_line_id');
            $table->unsignedBigInteger('warehouse_item_id');
            $table->string('profile_code', 50);
            $table->unsignedInteger('cut_length_mm');
            $table->unsignedInteger('pieces')->default(1);
            $table->unsignedInteger('bar_length_mm')->nullable();
            $table->unsignedInteger('waste_mm')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('generated_at');
            $table->foreignId('generated_by')->constrained('users');
            $table->timestamps();

            $table->index('production_order_id');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("CREATE UNIQUE INDEX idx_production_orders_project_active ON production_orders (project_id) WHERE status IN ('scheduled', 'in_progress')");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_production_orders_project_active');
        }

        Schema::dropIfExists('cutting_sheets');
        Schema::dropIfExists('production_material_releases');
        Schema::dropIfExists('production_order_teams');
    }
};

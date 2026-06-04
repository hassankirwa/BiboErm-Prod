<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_orders', function (Blueprint $table) {
            $table->index(['fifo_position', 'status'], 'idx_production_orders_fifo');
            $table->index('project_id', 'idx_production_orders_project');
        });

        Schema::table('production_stage_logs', function (Blueprint $table) {
            $table->index(['production_order_id', 'stage'], 'idx_production_stage_logs_order');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("
                CREATE TRIGGER production_orders_one_active_insert
                BEFORE INSERT ON production_orders
                FOR EACH ROW
                BEGIN
                    IF NEW.status IN ('scheduled', 'in_progress') AND EXISTS (
                        SELECT 1 FROM production_orders
                        WHERE project_id = NEW.project_id
                          AND status IN ('scheduled', 'in_progress')
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Only one active production order per project is allowed.';
                    END IF;
                END
            ");

            DB::statement("
                CREATE TRIGGER production_orders_one_active_update
                BEFORE UPDATE ON production_orders
                FOR EACH ROW
                BEGIN
                    IF NEW.status IN ('scheduled', 'in_progress') AND EXISTS (
                        SELECT 1 FROM production_orders
                        WHERE project_id = NEW.project_id
                          AND id <> NEW.id
                          AND status IN ('scheduled', 'in_progress')
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Only one active production order per project is allowed.';
                    END IF;
                END
            ");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_insert');
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_update');
        }

        Schema::table('production_stage_logs', function (Blueprint $table) {
            $table->dropIndex('idx_production_stage_logs_order');
        });

        Schema::table('production_orders', function (Blueprint $table) {
            $table->dropIndex('idx_production_orders_fifo');
            $table->dropIndex('idx_production_orders_project');
        });
    }
};

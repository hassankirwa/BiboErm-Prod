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
            if (! Schema::hasColumn('production_orders', 'project_wave_id')) {
                $table->foreignId('project_wave_id')
                    ->nullable()
                    ->after('project_id')
                    ->constrained('project_waves')
                    ->nullOnDelete();
                $table->index(['project_id', 'project_wave_id']);
            }
        });

        Schema::table('field_installation_jobs', function (Blueprint $table) {
            if (! Schema::hasColumn('field_installation_jobs', 'project_wave_id')) {
                $table->foreignId('project_wave_id')
                    ->nullable()
                    ->after('project_id')
                    ->constrained('project_waves')
                    ->nullOnDelete();
                $table->index(['project_id', 'project_wave_id']);
            }
        });

        Schema::table('field_installation_units', function (Blueprint $table) {
            if (! Schema::hasColumn('field_installation_units', 'project_scope_id')) {
                $table->foreignId('project_scope_id')
                    ->nullable()
                    ->after('project_floor_id')
                    ->constrained('project_scopes')
                    ->nullOnDelete();
            }
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_production_orders_project_active');
            DB::statement("
                CREATE UNIQUE INDEX idx_production_orders_project_wave_active
                ON production_orders (project_id, COALESCE(project_wave_id, 0))
                WHERE status IN ('scheduled', 'in_progress')
            ");
        }

        if ($driver === 'mysql') {
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_insert');
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_update');

            DB::statement("
                CREATE TRIGGER production_orders_one_active_insert
                BEFORE INSERT ON production_orders
                FOR EACH ROW
                BEGIN
                    IF NEW.status IN ('scheduled', 'in_progress') AND EXISTS (
                        SELECT 1 FROM production_orders
                        WHERE project_id = NEW.project_id
                          AND COALESCE(project_wave_id, 0) = COALESCE(NEW.project_wave_id, 0)
                          AND status IN ('scheduled', 'in_progress')
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Only one active production order per project wave is allowed.';
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
                          AND COALESCE(project_wave_id, 0) = COALESCE(NEW.project_wave_id, 0)
                          AND id <> NEW.id
                          AND status IN ('scheduled', 'in_progress')
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Only one active production order per project wave is allowed.';
                    END IF;
                END
            ");
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_production_orders_project_wave_active');
            DB::statement("
                CREATE UNIQUE INDEX idx_production_orders_project_active
                ON production_orders (project_id)
                WHERE status IN ('scheduled', 'in_progress')
            ");
        }

        if ($driver === 'mysql') {
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_insert');
            DB::statement('DROP TRIGGER IF EXISTS production_orders_one_active_update');

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

        Schema::table('field_installation_units', function (Blueprint $table) {
            if (Schema::hasColumn('field_installation_units', 'project_scope_id')) {
                $table->dropConstrainedForeignId('project_scope_id');
            }
        });

        Schema::table('field_installation_jobs', function (Blueprint $table) {
            if (Schema::hasColumn('field_installation_jobs', 'project_wave_id')) {
                $table->dropConstrainedForeignId('project_wave_id');
            }
        });

        Schema::table('production_orders', function (Blueprint $table) {
            if (Schema::hasColumn('production_orders', 'project_wave_id')) {
                $table->dropConstrainedForeignId('project_wave_id');
            }
        });
    }
};

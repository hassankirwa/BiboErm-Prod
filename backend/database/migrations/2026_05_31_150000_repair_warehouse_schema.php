<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->createCoreWarehouseTables();
        $this->createWarehouseItemTables();
        $this->createWarehouseStockTables();
        $this->createWarehouseToolTables();

        $this->repairWarehouseIndexesAndForeignKeys();
        $this->repairCrossModuleWarehouseForeignKeys();
    }

    public function down(): void
    {
        // This is a drift-repair migration. Reversing it could remove valid production schema.
    }

    private function createCoreWarehouseTables(): void
    {
        if (! Schema::hasTable('warehouses')) {
            Schema::create('warehouses', function (Blueprint $table) {
                $table->id();
                $table->string('code', 30)->unique();
                $table->string('name');
                $table->text('address')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('door_types')) {
            Schema::create('door_types', function (Blueprint $table) {
                $table->id();
                $table->string('code', 20)->unique();
                $table->string('name');
                $table->string('section_code', 30);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('warehouse_decks')) {
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
        }

        if (! Schema::hasTable('warehouse_sections')) {
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
        }

        if (! Schema::hasTable('warehouse_bins')) {
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
        }
    }

    private function createWarehouseItemTables(): void
    {
        if (! Schema::hasTable('warehouse_items')) {
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
        }

        if (! Schema::hasTable('aluminium_profiles')) {
            Schema::create('aluminium_profiles', function (Blueprint $table) {
                $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
                $table->string('profile_family', 100);
                $table->decimal('width_mm', 10, 2)->nullable();
                $table->decimal('depth_mm', 10, 2)->nullable();
                $table->string('finish', 100)->nullable();
                $table->decimal('weight_per_metre', 10, 4)->nullable();
                $table->integer('standard_bar_length_mm')->nullable();
            });
        }

        if (! Schema::hasTable('accessories')) {
            Schema::create('accessories', function (Blueprint $table) {
                $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
                $table->foreignId('door_type_id')->constrained('door_types')->restrictOnDelete();
                $table->foreignId('default_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();

                $table->index('door_type_id');
                $table->index('default_bin_id');
            });
        }

        if (! Schema::hasTable('rubbers')) {
            Schema::create('rubbers', function (Blueprint $table) {
                $table->foreignId('item_id')->primary()->constrained('warehouse_items')->cascadeOnDelete();
                $table->json('compatible_profile_ids')->nullable();
                $table->foreignId('default_section_id')->nullable()->constrained('warehouse_sections')->nullOnDelete();

                $table->index('default_section_id');
            });
        }

        if (! Schema::hasTable('door_type_accessories')) {
            Schema::create('door_type_accessories', function (Blueprint $table) {
                $table->foreignId('door_type_id')->constrained('door_types')->cascadeOnDelete();
                $table->foreignId('item_id')->constrained('warehouse_items')->cascadeOnDelete();
                $table->decimal('standard_qty', 10, 2)->default(1);

                $table->primary(['door_type_id', 'item_id']);
            });
        }
    }

    private function createWarehouseStockTables(): void
    {
        if (! Schema::hasTable('stock_levels')) {
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
        }

        if (! Schema::hasTable('stock_movements')) {
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
        }

        if (! Schema::hasTable('stock_movement_lines')) {
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
        }

        if (! Schema::hasTable('stock_reservations')) {
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
        }

        if (! Schema::hasTable('stock_reservation_lines')) {
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
        }

        if (! Schema::hasTable('offcut_pieces')) {
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
        }
    }

    private function createWarehouseToolTables(): void
    {
        if (! Schema::hasTable('warehouse_tools')) {
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
        }

        if (! Schema::hasTable('tool_issuances')) {
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
    }

    private function repairWarehouseIndexesAndForeignKeys(): void
    {
        $this->ensureUnique('warehouses', ['code'], 'warehouses_code_unique');
        $this->ensureUnique('door_types', ['code'], 'door_types_code_unique');

        $this->ensureForeign('warehouse_decks', 'warehouse_id', 'warehouse_decks_warehouse_id_foreign', 'warehouses', onDelete: 'cascade');
        $this->ensureUnique('warehouse_decks', ['warehouse_id', 'slug'], 'warehouse_decks_warehouse_id_slug_unique');
        $this->ensureIndex('warehouse_decks', ['warehouse_id'], 'warehouse_decks_warehouse_id_index');

        $this->ensureForeign('warehouse_sections', 'deck_id', 'warehouse_sections_deck_id_foreign', 'warehouse_decks', onDelete: 'cascade');
        $this->ensureForeign('warehouse_sections', 'door_type_id', 'warehouse_sections_door_type_id_foreign', 'door_types', onDelete: 'set null');
        $this->ensureUnique('warehouse_sections', ['deck_id', 'code'], 'warehouse_sections_deck_id_code_unique');
        $this->ensureIndex('warehouse_sections', ['door_type_id'], 'warehouse_sections_door_type_id_index');
        $this->ensureIndex('warehouse_sections', ['section_type'], 'warehouse_sections_section_type_index');

        $this->ensureForeign('warehouse_bins', 'section_id', 'warehouse_bins_section_id_foreign', 'warehouse_sections', onDelete: 'cascade');
        $this->ensureUnique('warehouse_bins', ['section_id', 'code'], 'warehouse_bins_section_id_code_unique');
        $this->ensureIndex('warehouse_bins', ['section_id'], 'warehouse_bins_section_id_index');

        $this->ensureForeign('warehouse_items', 'door_type_id', 'warehouse_items_door_type_id_foreign', 'door_types', onDelete: 'set null');
        $this->ensureUnique('warehouse_items', ['sku'], 'warehouse_items_sku_unique');
        $this->ensureIndex('warehouse_items', ['category'], 'warehouse_items_category_index');
        $this->ensureIndex('warehouse_items', ['door_type_id'], 'warehouse_items_door_type_id_index');
        $this->ensureIndex('warehouse_items', ['is_active'], 'warehouse_items_is_active_index');

        $this->ensureForeign('aluminium_profiles', 'item_id', 'aluminium_profiles_item_id_foreign', 'warehouse_items', onDelete: 'cascade');

        $this->ensureForeign('accessories', 'item_id', 'accessories_item_id_foreign', 'warehouse_items', onDelete: 'cascade');
        $this->ensureForeign('accessories', 'door_type_id', 'accessories_door_type_id_foreign', 'door_types', onDelete: 'restrict');
        $this->ensureForeign('accessories', 'default_bin_id', 'accessories_default_bin_id_foreign', 'warehouse_bins', onDelete: 'set null');
        $this->ensureIndex('accessories', ['door_type_id'], 'accessories_door_type_id_index');
        $this->ensureIndex('accessories', ['default_bin_id'], 'accessories_default_bin_id_index');

        $this->ensureForeign('rubbers', 'item_id', 'rubbers_item_id_foreign', 'warehouse_items', onDelete: 'cascade');
        $this->ensureForeign('rubbers', 'default_section_id', 'rubbers_default_section_id_foreign', 'warehouse_sections', onDelete: 'set null');
        $this->ensureIndex('rubbers', ['default_section_id'], 'rubbers_default_section_id_index');

        $this->ensureForeign('door_type_accessories', 'door_type_id', 'door_type_accessories_door_type_id_foreign', 'door_types', onDelete: 'cascade');
        $this->ensureForeign('door_type_accessories', 'item_id', 'door_type_accessories_item_id_foreign', 'warehouse_items', onDelete: 'cascade');

        $this->ensureForeign('stock_levels', 'item_id', 'stock_levels_item_id_foreign', 'warehouse_items', onDelete: 'cascade');
        $this->ensureForeign('stock_levels', 'bin_id', 'stock_levels_bin_id_foreign', 'warehouse_bins', onDelete: 'cascade');
        $this->ensureUnique('stock_levels', ['item_id', 'bin_id'], 'stock_levels_item_id_bin_id_unique');
        $this->ensureIndex('stock_levels', ['item_id'], 'stock_levels_item_id_index');
        $this->ensureIndex('stock_levels', ['bin_id'], 'stock_levels_bin_id_index');

        $this->ensureForeign('stock_movements', 'performed_by', 'stock_movements_performed_by_foreign', 'users', onDelete: 'restrict');
        $this->ensureUnique('stock_movements', ['movement_number'], 'stock_movements_movement_number_unique');
        $this->ensureIndex('stock_movements', ['movement_type'], 'stock_movements_movement_type_index');
        $this->ensureIndex('stock_movements', ['reference_type', 'reference_id'], 'stock_movements_reference_type_reference_id_index');
        $this->ensureIndex('stock_movements', ['performed_at'], 'stock_movements_performed_at_index');
        $this->ensureIndex('stock_movements', ['performed_by'], 'stock_movements_performed_by_index');

        $this->ensureForeign('stock_movement_lines', 'stock_movement_id', 'stock_movement_lines_stock_movement_id_foreign', 'stock_movements', onDelete: 'cascade');
        $this->ensureForeign('stock_movement_lines', 'item_id', 'stock_movement_lines_item_id_foreign', 'warehouse_items', onDelete: 'restrict');
        $this->ensureForeign('stock_movement_lines', 'from_bin_id', 'stock_movement_lines_from_bin_id_foreign', 'warehouse_bins', onDelete: 'set null');
        $this->ensureForeign('stock_movement_lines', 'to_bin_id', 'stock_movement_lines_to_bin_id_foreign', 'warehouse_bins', onDelete: 'set null');
        $this->ensureIndex('stock_movement_lines', ['stock_movement_id'], 'stock_movement_lines_stock_movement_id_index');
        $this->ensureIndex('stock_movement_lines', ['item_id'], 'stock_movement_lines_item_id_index');
        $this->ensureIndex('stock_movement_lines', ['from_bin_id'], 'stock_movement_lines_from_bin_id_index');
        $this->ensureIndex('stock_movement_lines', ['to_bin_id'], 'stock_movement_lines_to_bin_id_index');

        $this->ensureForeign('stock_reservations', 'project_id', 'stock_reservations_project_id_foreign', 'projects', onDelete: 'cascade');
        $this->ensureForeign('stock_reservations', 'reserved_by', 'stock_reservations_reserved_by_foreign', 'users', onDelete: 'restrict');
        $this->ensureUnique('stock_reservations', ['reservation_number'], 'stock_reservations_reservation_number_unique');
        $this->ensureIndex('stock_reservations', ['project_id'], 'stock_reservations_project_id_index');
        $this->ensureIndex('stock_reservations', ['status'], 'stock_reservations_status_index');
        $this->ensureIndex('stock_reservations', ['fifo_sequence'], 'stock_reservations_fifo_sequence_index');

        $this->ensureForeign('stock_reservation_lines', 'reservation_id', 'stock_reservation_lines_reservation_id_foreign', 'stock_reservations', onDelete: 'cascade');
        $this->ensureForeign('stock_reservation_lines', 'item_id', 'stock_reservation_lines_item_id_foreign', 'warehouse_items', onDelete: 'restrict');
        $this->ensureForeign('stock_reservation_lines', 'bin_id', 'stock_reservation_lines_bin_id_foreign', 'warehouse_bins', onDelete: 'restrict');
        $this->ensureIndex('stock_reservation_lines', ['reservation_id'], 'stock_reservation_lines_reservation_id_index');
        $this->ensureIndex('stock_reservation_lines', ['item_id'], 'stock_reservation_lines_item_id_index');
        $this->ensureIndex('stock_reservation_lines', ['bin_id'], 'stock_reservation_lines_bin_id_index');

        $this->ensureForeign('offcut_pieces', 'item_id', 'offcut_pieces_item_id_foreign', 'warehouse_items', onDelete: 'restrict');
        $this->ensureForeign('offcut_pieces', 'bin_id', 'offcut_pieces_bin_id_foreign', 'warehouse_bins', onDelete: 'restrict');
        $this->ensureForeign('offcut_pieces', 'source_project_id', 'offcut_pieces_source_project_id_foreign', 'projects', onDelete: 'set null');
        $this->ensureForeign('offcut_pieces', 'source_movement_id', 'offcut_pieces_source_movement_id_foreign', 'stock_movements', onDelete: 'set null');
        $this->ensureForeign('offcut_pieces', 'allocated_project_id', 'offcut_pieces_allocated_project_id_foreign', 'projects', onDelete: 'set null');
        $this->ensureForeign('offcut_pieces', 'logged_by', 'offcut_pieces_logged_by_foreign', 'users', onDelete: 'restrict');
        $this->ensureUnique('offcut_pieces', ['offcut_number'], 'offcut_pieces_offcut_number_unique');
        $this->ensureIndex('offcut_pieces', ['item_id', 'length_mm', 'status'], 'offcut_pieces_item_id_length_mm_status_index');
        $this->ensureIndex('offcut_pieces', ['bin_id'], 'offcut_pieces_bin_id_index');
        $this->ensureIndex('offcut_pieces', ['allocated_project_id'], 'offcut_pieces_allocated_project_id_index');
        $this->ensureIndex('offcut_pieces', ['source_project_id'], 'offcut_pieces_source_project_id_index');

        $this->ensureUnique('warehouse_tools', ['tool_code'], 'warehouse_tools_tool_code_unique');
        $this->ensureIndex('warehouse_tools', ['is_active'], 'warehouse_tools_is_active_index');
        $this->ensureIndex('warehouse_tools', ['condition'], 'warehouse_tools_condition_index');

        $this->ensureForeign('tool_issuances', 'tool_id', 'tool_issuances_tool_id_foreign', 'warehouse_tools', onDelete: 'restrict');
        $this->ensureForeign('tool_issuances', 'project_id', 'tool_issuances_project_id_foreign', 'projects', onDelete: 'set null');
        $this->ensureForeign('tool_issuances', 'issued_to', 'tool_issuances_issued_to_foreign', 'users', onDelete: 'restrict');
        $this->ensureForeign('tool_issuances', 'issued_by', 'tool_issuances_issued_by_foreign', 'users', onDelete: 'restrict');
        $this->ensureIndex('tool_issuances', ['tool_id'], 'tool_issuances_tool_id_index');
        $this->ensureIndex('tool_issuances', ['project_id'], 'tool_issuances_project_id_index');
        $this->ensureIndex('tool_issuances', ['issued_to'], 'tool_issuances_issued_to_index');
        $this->ensureIndex('tool_issuances', ['return_date'], 'tool_issuances_return_date_index');
    }

    private function repairCrossModuleWarehouseForeignKeys(): void
    {
        $this->ensureForeign('project_bom_lines', 'warehouse_item_id', 'project_bom_lines_warehouse_item_id_foreign', 'warehouse_items', onDelete: 'set null');
        $this->ensureForeign('purchase_requisition_lines', 'warehouse_item_id', 'purchase_requisition_lines_warehouse_item_id_foreign', 'warehouse_items', onDelete: 'set null');
        $this->ensureForeign('purchase_order_lines', 'warehouse_item_id', 'purchase_order_lines_warehouse_item_id_foreign', 'warehouse_items', onDelete: 'set null');
        $this->ensureForeign('goods_receipt_lines', 'warehouse_item_id', 'goods_receipt_lines_warehouse_item_id_foreign', 'warehouse_items', onDelete: 'set null');
        $this->ensureForeign('goods_receipt_lines', 'to_bin_id', 'goods_receipt_lines_to_bin_id_foreign', 'warehouse_bins', onDelete: 'set null');
        $this->ensureForeign('supplier_item_prices', 'warehouse_item_id', 'supplier_item_prices_warehouse_item_id_foreign', 'warehouse_items', onDelete: 'cascade');
    }

    private function ensureIndex(string $table, array $columns, string $indexName): void
    {
        if (! Schema::hasTable($table) || ! $this->tableHasColumns($table, $columns) || $this->indexExists($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $indexName) {
            $blueprint->index($columns, $indexName);
        });
    }

    private function ensureUnique(string $table, array $columns, string $indexName): void
    {
        if (! Schema::hasTable($table) || ! $this->tableHasColumns($table, $columns) || $this->indexExists($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $indexName) {
            $blueprint->unique($columns, $indexName);
        });
    }

    private function ensureForeign(
        string $table,
        string $column,
        string $constraint,
        string $referencesTable,
        string $referencesColumn = 'id',
        string $onDelete = 'restrict',
    ): void {
        if (
            ! Schema::hasTable($table)
            || ! Schema::hasTable($referencesTable)
            || ! Schema::hasColumn($table, $column)
            || ! Schema::hasColumn($referencesTable, $referencesColumn)
            || $this->foreignKeyExists($table, $constraint, $column, $referencesTable)
        ) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use (
            $column,
            $constraint,
            $referencesTable,
            $referencesColumn,
            $onDelete
        ) {
            $foreign = $blueprint->foreign($column, $constraint)
                ->references($referencesColumn)
                ->on($referencesTable);

            match ($onDelete) {
                'cascade' => $foreign->cascadeOnDelete(),
                'set null' => $foreign->nullOnDelete(),
                default => $foreign->restrictOnDelete(),
            };
        });
    }

    private function tableHasColumns(string $table, array $columns): bool
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            $result = DB::selectOne(
                <<<'SQL'
                select 1
                from pg_indexes
                where schemaname = current_schema()
                  and tablename = ?
                  and indexname = ?
                limit 1
                SQL,
                [$table, $indexName],
            );

            return $result !== null;
        }

        if ($driver === 'sqlite') {
            $indexes = DB::select(sprintf("PRAGMA index_list('%s')", $table));

            foreach ($indexes as $index) {
                if (($index->name ?? null) === $indexName) {
                    return true;
                }
            }

            return false;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $result = DB::selectOne(
                <<<'SQL'
                select 1
                from information_schema.statistics
                where table_schema = database()
                  and table_name = ?
                  and index_name = ?
                limit 1
                SQL,
                [$table, $indexName],
            );

            return $result !== null;
        }

        return false;
    }

    private function foreignKeyExists(
        string $table,
        string $constraint,
        ?string $column = null,
        ?string $referencesTable = null,
    ): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            $result = DB::selectOne(
                <<<'SQL'
                select 1
                from pg_constraint c
                join pg_class t on t.oid = c.conrelid
                join pg_namespace n on n.oid = t.relnamespace
                where c.contype = 'f'
                  and n.nspname = current_schema()
                  and t.relname = ?
                  and c.conname = ?
                limit 1
                SQL,
                [$table, $constraint],
            );

            return $result !== null;
        }

        if ($driver === 'sqlite') {
            $foreignKeys = DB::select(sprintf("PRAGMA foreign_key_list('%s')", $table));

            foreach ($foreignKeys as $foreignKey) {
                if (
                    $column !== null
                    && $referencesTable !== null
                    && ($foreignKey->from ?? null) === $column
                    && ($foreignKey->table ?? null) === $referencesTable
                ) {
                    return true;
                }
            }

            return false;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $result = DB::selectOne(
                <<<'SQL'
                select 1
                from information_schema.referential_constraints
                where constraint_schema = database()
                  and table_name = ?
                  and constraint_name = ?
                limit 1
                SQL,
                [$table, $constraint],
            );

            return $result !== null;
        }

        return false;
    }
};

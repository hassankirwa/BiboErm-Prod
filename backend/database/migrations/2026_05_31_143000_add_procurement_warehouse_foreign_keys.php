<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addForeignIfPossible(
            table: 'purchase_requisition_lines',
            column: 'warehouse_item_id',
            constraint: 'purchase_requisition_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
            onDelete: 'set null',
        );

        $this->addForeignIfPossible(
            table: 'purchase_order_lines',
            column: 'warehouse_item_id',
            constraint: 'purchase_order_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
            onDelete: 'set null',
        );

        $this->addForeignIfPossible(
            table: 'goods_receipt_lines',
            column: 'warehouse_item_id',
            constraint: 'goods_receipt_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
            onDelete: 'set null',
        );

        $this->addForeignIfPossible(
            table: 'goods_receipt_lines',
            column: 'to_bin_id',
            constraint: 'goods_receipt_lines_to_bin_id_foreign',
            referencesTable: 'warehouse_bins',
            onDelete: 'set null',
        );

        $this->addForeignIfPossible(
            table: 'supplier_item_prices',
            column: 'warehouse_item_id',
            constraint: 'supplier_item_prices_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
            onDelete: 'cascade',
        );
    }

    public function down(): void
    {
        $this->dropForeignIfPresent(
            table: 'supplier_item_prices',
            column: 'warehouse_item_id',
            constraint: 'supplier_item_prices_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
        );

        $this->dropForeignIfPresent(
            table: 'goods_receipt_lines',
            column: 'to_bin_id',
            constraint: 'goods_receipt_lines_to_bin_id_foreign',
            referencesTable: 'warehouse_bins',
        );

        $this->dropForeignIfPresent(
            table: 'goods_receipt_lines',
            column: 'warehouse_item_id',
            constraint: 'goods_receipt_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
        );

        $this->dropForeignIfPresent(
            table: 'purchase_order_lines',
            column: 'warehouse_item_id',
            constraint: 'purchase_order_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
        );

        $this->dropForeignIfPresent(
            table: 'purchase_requisition_lines',
            column: 'warehouse_item_id',
            constraint: 'purchase_requisition_lines_warehouse_item_id_foreign',
            referencesTable: 'warehouse_items',
        );
    }

    private function addForeignIfPossible(
        string $table,
        string $column,
        string $constraint,
        string $referencesTable,
        string $onDelete,
    ): void {
        if (! Schema::hasTable($table) || ! Schema::hasTable($referencesTable) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        if ($this->foreignKeyExists($table, $constraint, $column, $referencesTable)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($column, $constraint, $referencesTable, $onDelete) {
            $foreign = $table->foreign($column, $constraint)
                ->references('id')
                ->on($referencesTable);

            if ($onDelete === 'cascade') {
                $foreign->cascadeOnDelete();
                return;
            }

            $foreign->nullOnDelete();
        });
    }

    private function dropForeignIfPresent(
        string $table,
        string $column,
        string $constraint,
        string $referencesTable,
    ): void {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        if (! $this->foreignKeyExists($table, $constraint, $column, $referencesTable)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($constraint) {
            $table->dropForeign($constraint);
        });
    }

    private function foreignKeyExists(
        string $table,
        string $constraint,
        string $column,
        string $referencesTable,
    ): bool {
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
                if (($foreignKey->from ?? null) === $column && ($foreignKey->table ?? null) === $referencesTable) {
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

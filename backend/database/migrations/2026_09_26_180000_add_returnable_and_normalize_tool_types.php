<?php

use App\Enums\Warehouse\ToolType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_tools', function (Blueprint $table) {
            $table->boolean('is_returnable')->default(true)->after('tool_type');
            $table->index('tool_type');
            $table->index('is_returnable');
        });

        $rows = DB::table('warehouse_tools')->select('id', 'tool_type')->get();
        foreach ($rows as $row) {
            $type = ToolType::tryFromLoose($row->tool_type);
            $normalized = $type?->value ?? (
                $row->tool_type ? ToolType::Other->value : null
            );
            $returnable = $type?->defaultReturnable() ?? true;

            DB::table('warehouse_tools')->where('id', $row->id)->update([
                'tool_type' => $normalized,
                'is_returnable' => $returnable,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('warehouse_tools', function (Blueprint $table) {
            $table->dropIndex(['tool_type']);
            $table->dropIndex(['is_returnable']);
            $table->dropColumn('is_returnable');
        });
    }
};

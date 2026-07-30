<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_bin_catalog_codes', function (Blueprint $table) {
            $table->string('source_name')->nullable()->after('normalized_code');
            $table->string('source_sheet')->nullable()->after('source_name');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bin_catalog_codes', function (Blueprint $table) {
            $table->dropColumn(['source_name', 'source_sheet']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_bin_catalog_codes', function (Blueprint $table) {
            $table->text('source_description')->nullable()->after('source_name');
            $table->string('image_path')->nullable()->after('source_sheet');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bin_catalog_codes', function (Blueprint $table) {
            $table->dropColumn(['source_description', 'image_path']);
        });
    }
};

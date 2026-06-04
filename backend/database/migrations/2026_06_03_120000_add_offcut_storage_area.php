<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offcut_pieces', function (Blueprint $table) {
            if (! Schema::hasColumn('offcut_pieces', 'storage_area')) {
                $table->string('storage_area', 32)->default('warehouse_deck')->after('bin_id');
            }
        });

        Schema::table('offcut_pieces', function (Blueprint $table) {
            $table->unsignedBigInteger('bin_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('offcut_pieces', function (Blueprint $table) {
            if (Schema::hasColumn('offcut_pieces', 'storage_area')) {
                $table->dropColumn('storage_area');
            }
        });
    }
};

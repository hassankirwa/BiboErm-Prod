<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aluminium_profiles', function (Blueprint $table) {
            $table->foreignId('default_bin_id')
                ->nullable()
                ->after('standard_bar_length_mm')
                ->constrained('warehouse_bins')
                ->nullOnDelete();
        });

        Schema::create('warehouse_bin_catalog_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bin_id')->constrained('warehouse_bins')->cascadeOnDelete();
            $table->string('code', 120);
            $table->string('normalized_code', 120);
            $table->string('source_file', 255)->nullable();
            $table->timestamps();

            $table->index('normalized_code');
            $table->unique(['bin_id', 'normalized_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_bin_catalog_codes');

        Schema::table('aluminium_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_bin_id');
        });
    }
};

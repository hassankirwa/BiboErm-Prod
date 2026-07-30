<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_item_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_item_id')->constrained('warehouse_items')->cascadeOnDelete();
            $table->string('source_system', 50)->default('wincad');
            $table->string('source_code', 100)->nullable();
            $table->string('source_name');
            $table->string('series', 100)->nullable();
            $table->string('line_type', 50)->nullable();
            $table->unsignedTinyInteger('confidence')->default(100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['source_system', 'source_code']);
            $table->index(['source_system', 'source_name']);
            $table->index(['line_type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_item_aliases');
    }
};

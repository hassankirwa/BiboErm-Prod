<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->string('catalog_tier', 30)->nullable()->after('is_active');
            $table->text('description')->nullable()->after('catalog_tier');
            $table->string('image_path')->nullable()->after('description');
            $table->json('catalog_metadata')->nullable()->after('image_path');

            $table->index('catalog_tier');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropIndex(['catalog_tier']);
            $table->dropColumn(['catalog_tier', 'description', 'image_path', 'catalog_metadata']);
        });
    }
};

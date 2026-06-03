<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_boms')) {
            return;
        }

        Schema::table('project_boms', function (Blueprint $table) {
            if (! Schema::hasColumn('project_boms', 'extracted_data')) {
                $table->json('extracted_data')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('project_boms') || ! Schema::hasColumn('project_boms', 'extracted_data')) {
            return;
        }

        Schema::table('project_boms', function (Blueprint $table) {
            $table->dropColumn('extracted_data');
        });
    }
};

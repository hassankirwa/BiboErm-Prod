<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->unsignedSmallInteger('revision_number')->default(1)->after('revision_of_id');
            $table->boolean('is_reference_copy')->default(false)->after('revision_number');
            $table->foreignId('root_quotation_id')->nullable()->after('is_reference_copy')
                ->constrained('quotations')->nullOnDelete();
            $table->json('negotiation_notes')->nullable()->after('root_quotation_id');
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->index(['root_quotation_id', 'is_reference_copy']);
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex(['root_quotation_id', 'is_reference_copy']);
            $table->dropConstrainedForeignId('root_quotation_id');
            $table->dropColumn(['revision_number', 'is_reference_copy', 'negotiation_notes']);
        });
    }
};

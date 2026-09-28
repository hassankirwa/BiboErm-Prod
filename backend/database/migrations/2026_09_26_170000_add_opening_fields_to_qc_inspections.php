<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qc_inspections', function (Blueprint $table) {
            $table->foreignId('project_document_id')
                ->nullable()
                ->after('project_id')
                ->constrained('project_documents')
                ->nullOnDelete();
            $table->string('opening_code', 64)->nullable()->after('project_document_id');
            $table->index(['opening_code'], 'idx_qc_inspections_opening_code');
            $table->index(
                ['production_order_id', 'context', 'stage', 'opening_code'],
                'idx_qc_inspections_order_opening',
            );
            $table->index(
                ['field_installation_job_id', 'context', 'opening_code'],
                'idx_qc_inspections_field_opening',
            );
        });
    }

    public function down(): void
    {
        Schema::table('qc_inspections', function (Blueprint $table) {
            $table->dropIndex('idx_qc_inspections_opening_code');
            $table->dropIndex('idx_qc_inspections_order_opening');
            $table->dropIndex('idx_qc_inspections_field_opening');
            $table->dropConstrainedForeignId('project_document_id');
            $table->dropColumn('opening_code');
        });
    }
};

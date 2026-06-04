<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qc_checklist_templates', function (Blueprint $table) {
            $table->string('context', 64)->default('production_qc_post_fabrication')->after('stage');
            $table->text('description')->nullable()->after('context');
            $table->boolean('is_system')->default(false)->after('is_active');
            $table->foreignId('project_id')->nullable()->after('is_system')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_template_id')->nullable()->after('project_id')
                ->constrained('qc_checklist_templates')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->after('parent_template_id')
                ->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1)->after('created_by');
        });

        if (Schema::hasColumn('qc_checklist_templates', 'stage')) {
            DB::table('qc_checklist_templates')->update([
                'context' => DB::raw('stage'),
            ]);
        }

        Schema::table('qc_checklist_templates', function (Blueprint $table) {
            $table->index(['context', 'is_active'], 'idx_qc_templates_context');
            $table->index('project_id', 'idx_qc_templates_project');
        });

        Schema::table('qc_inspections', function (Blueprint $table) {
            $table->string('context', 64)->default('production_qc_post_fabrication')->after('stage');
            $table->foreignId('template_id')->nullable()->after('context')
                ->constrained('qc_checklist_templates')->nullOnDelete();
            $table->unsignedBigInteger('goods_receipt_id')->nullable()->after('production_order_id');
            $table->unsignedBigInteger('field_installation_job_id')->nullable()->after('goods_receipt_id');
            $table->string('warehouse_deck_slug', 40)->nullable()->after('field_installation_job_id');
            $table->unsignedBigInteger('warehouse_section_id')->nullable()->after('warehouse_deck_slug');
            $table->unsignedBigInteger('tool_id')->nullable()->after('warehouse_section_id');
            $table->json('custom_items')->default('[]')->after('checklist_responses');
            $table->text('internal_notes')->nullable()->after('notes');
            $table->foreignId('completed_by')->nullable()->after('inspector_id')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable()->after('inspected_at');
        });

        if (Schema::hasColumn('qc_inspections', 'stage')) {
            DB::table('qc_inspections')->update([
                'context' => DB::raw('stage'),
            ]);
        }

        Schema::table('qc_inspections', function (Blueprint $table) {
            $table->index(['context', 'result'], 'idx_qc_inspections_context');
            $table->index('goods_receipt_id', 'idx_qc_inspections_grn');
            $table->index('field_installation_job_id', 'idx_qc_inspections_field_job');
            $table->index(['project_id', 'context'], 'idx_qc_inspections_project');
        });

        Schema::create('qc_inspection_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('qc_inspections')->cascadeOnDelete();
            $table->foreignId('defect_id')->nullable()->constrained('qc_defects')->nullOnDelete();
            $table->string('checklist_key', 80)->nullable();
            $table->string('file_path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->text('caption')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('qc_inspection_photos', function (Blueprint $table) {
            $table->index('inspection_id', 'idx_qc_photos_inspection');
        });

        Schema::table('qc_defects', function (Blueprint $table) {
            $table->string('checklist_key', 80)->nullable()->after('inspection_id');
            $table->foreignId('reported_by')->nullable()->after('description')
                ->constrained('users')->nullOnDelete();
            $table->text('resolution_notes')->nullable()->after('status');
        });

        Schema::create('qc_inspection_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('context', 64);
            $table->string('frequency', 20);
            $table->unsignedInteger('frequency_interval')->default(1);
            $table->string('warehouse_deck_slug', 40)->nullable();
            $table->unsignedBigInteger('warehouse_section_id')->nullable();
            $table->string('tool_scope', 30)->nullable()->default('all');
            $table->string('assigned_role', 50)->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('qc_checklist_templates')->nullOnDelete();
            $table->timestamp('next_due_at');
            $table->timestamp('last_run_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::table('qc_inspection_schedules', function (Blueprint $table) {
            $table->index(['next_due_at', 'is_active'], 'idx_qc_schedules_due');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_inspection_schedules');

        Schema::table('qc_defects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reported_by');
            $table->dropColumn(['checklist_key', 'resolution_notes']);
        });

        Schema::dropIfExists('qc_inspection_photos');

        Schema::table('qc_inspections', function (Blueprint $table) {
            $table->dropIndex('idx_qc_inspections_context');
            $table->dropIndex('idx_qc_inspections_grn');
            $table->dropIndex('idx_qc_inspections_field_job');
            $table->dropIndex('idx_qc_inspections_project');
            $table->dropConstrainedForeignId('template_id');
            $table->dropConstrainedForeignId('completed_by');
            $table->dropColumn([
                'context',
                'goods_receipt_id',
                'field_installation_job_id',
                'warehouse_deck_slug',
                'warehouse_section_id',
                'tool_id',
                'custom_items',
                'internal_notes',
                'completed_at',
            ]);
        });

        Schema::table('qc_checklist_templates', function (Blueprint $table) {
            $table->dropIndex('idx_qc_templates_context');
            $table->dropIndex('idx_qc_templates_project');
            $table->dropConstrainedForeignId('project_id');
            $table->dropConstrainedForeignId('parent_template_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'context',
                'description',
                'is_system',
                'project_id',
                'parent_template_id',
                'created_by',
                'version',
            ]);
        });
    }
};

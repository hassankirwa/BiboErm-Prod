<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_floors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('floor_label', 100);
            $table->text('section_notes')->nullable();
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['project_id', 'floor_label']);
        });

        Schema::create('project_boms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 30)->default('draft');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source_file_path', 500)->nullable();
            $table->string('source_firebase_url', 500)->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'version']);
            $table->index(['project_id', 'status']);
        });

        Schema::create('project_bom_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bom_id')->constrained('project_boms')->cascadeOnDelete();
            $table->string('line_type', 30);
            // Warehouse tables migrate later, so add this FK in a follow-up migration.
            $table->unsignedBigInteger('warehouse_item_id')->nullable();
            $table->string('material_code', 50)->nullable();
            $table->string('material_name');
            $table->decimal('quantity', 15, 3)->default(1);
            $table->unsignedInteger('measurement_mm')->nullable();
            $table->boolean('is_procurement_only')->default(false);
            $table->boolean('is_glass')->default(false);
            $table->boolean('is_addon')->default(false);
            $table->string('compatible_profile_code', 50)->nullable();
            $table->foreignId('floor_id')->nullable()->constrained('project_floors')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('bom_id');
            $table->index('warehouse_item_id');
        });

        Schema::create('project_engineers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 50)->default('engineer');
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'user_id', 'role']);
        });

        Schema::create('project_delays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 64);
            $table->string('reason', 50);
            $table->unsignedInteger('days_lost')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('logged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('logged_at')->nullable();
            $table->timestamps();

            $table->index('project_id');
        });

        Schema::create('project_stage_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('stage', 64)->unique();
            $table->json('required_documents')->default('[]');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_stage_requirements');
        Schema::dropIfExists('project_delays');
        Schema::dropIfExists('project_engineers');
        Schema::dropIfExists('project_bom_lines');
        Schema::dropIfExists('project_boms');
        Schema::dropIfExists('project_floors');
    }
};

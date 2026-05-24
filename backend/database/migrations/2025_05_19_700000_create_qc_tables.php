<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qc_checklist_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('product_type', 64)->nullable();
            $table->string('stage', 64);
            $table->jsonb('items');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('qc_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('stage', 64);
            $table->string('result', 32)->default('pending');
            $table->foreignId('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('checklist_responses')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();
        });

        Schema::create('qc_defects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('qc_inspections')->cascadeOnDelete();
            $table->string('severity', 32);
            $table->string('description');
            $table->string('status', 32)->default('open');
            $table->jsonb('photo_paths')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_defects');
        Schema::dropIfExists('qc_inspections');
        Schema::dropIfExists('qc_checklist_templates');
    }
};

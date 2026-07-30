<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_change_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('field_non_conformity_id')->nullable()->constrained('field_non_conformities')->nullOnDelete();
            $table->string('status', 40);
            $table->text('reason')->nullable();
            $table->json('measurement_notes')->nullable();
            $table->json('scope_bom_line_ids')->nullable();
            $table->unsignedBigInteger('remeasure_site_visit_id')->nullable();
            $table->unsignedInteger('revised_bom_version')->nullable();
            $table->foreignId('parent_production_order_id')->nullable()->constrained('production_orders')->nullOnDelete();
            $table->foreignId('remake_production_order_id')->nullable()->constrained('production_orders')->nullOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('field_non_conformity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_change_orders');
    }
};

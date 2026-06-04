<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('field_delivery_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('transport_order_id')->nullable();
            $table->foreignId('received_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('received_at');
            $table->string('delivery_condition', 32);
            $table->string('vehicle_reg', 30)->nullable();
            $table->string('driver_name', 120)->nullable();
            $table->string('packing_list_ref', 60)->nullable();
            $table->unsignedInteger('expected_units')->nullable();
            $table->unsignedInteger('received_units')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('job_id');
        });

        Schema::create('field_delivery_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_record_id')->constrained('field_delivery_records')->cascadeOnDelete();
            $table->foreignId('project_bom_line_id')->nullable()->constrained('project_bom_lines')->nullOnDelete();
            $table->unsignedBigInteger('warehouse_item_id')->nullable();
            $table->string('description');
            $table->decimal('qty_expected', 15, 3);
            $table->decimal('qty_received', 15, 3);
            $table->string('unit', 20)->default('each');
            $table->text('condition_notes')->nullable();
            $table->timestamp('created_at');
        });

        Schema::create('field_non_conformities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_record_id')->nullable()->constrained('field_delivery_records')->nullOnDelete();
            $table->foreignId('daily_log_id')->nullable()->constrained('field_installation_daily_logs')->nullOnDelete();
            $table->string('nc_type', 50);
            $table->string('severity', 20);
            $table->string('status', 20)->default('open');
            $table->string('title');
            $table->text('description');
            $table->foreignId('project_bom_line_id')->nullable()->constrained('project_bom_lines')->nullOnDelete();
            $table->unsignedBigInteger('warehouse_item_id')->nullable();
            $table->decimal('qty_affected', 15, 3)->nullable();
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('reported_at');
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();

            $table->index(['job_id', 'status']);
            $table->index(['project_id', 'severity']);
        });

        Schema::create('field_installation_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->foreignId('project_bom_line_id')->nullable()->constrained('project_bom_lines')->nullOnDelete();
            $table->foreignId('project_floor_id')->nullable()->constrained('project_floors')->nullOnDelete();
            $table->string('unit_label');
            $table->string('status', 32)->default('pending');
            $table->timestamp('installed_at')->nullable();
            $table->foreignId('installed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('snag_notes')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['job_id', 'status']);
        });

        Schema::create('field_tool_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->foreignId('tool_issuance_id')->unique()->constrained('tool_issuances')->cascadeOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->date('expected_return_date')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_tool_assignments');
        Schema::dropIfExists('field_installation_units');
        Schema::dropIfExists('field_non_conformities');
        Schema::dropIfExists('field_delivery_lines');
        Schema::dropIfExists('field_delivery_records');
    }
};

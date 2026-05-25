<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('name');
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 64)->default('full_install');
            $table->string('location_type', 32)->default('nairobi');
            $table->text('site_address')->nullable();
            $table->string('stage', 64)->default('awaiting_deposit');
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->string('priority', 32)->default('normal');
            $table->decimal('quoted_amount', 14, 2)->nullable();
            $table->decimal('deposit_received', 14, 2)->nullable();
            $table->unsignedSmallInteger('overage_buffer_percent')->default(0);
            $table->date('projected_start')->nullable();
            $table->date('projected_end')->nullable();
            $table->date('actual_start')->nullable();
            $table->date('actual_end')->nullable();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('project_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('client_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('stage');
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });

        Schema::create('project_stage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('from_stage', 64)->nullable();
            $table->string('to_stage', 64);
            $table->text('delay_reason')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('changed_at');
            $table->timestamps();
        });

        Schema::create('project_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('filename');
            $table->string('path');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
        });

        Schema::dropIfExists('project_documents');
        Schema::dropIfExists('project_stage_logs');
        Schema::dropIfExists('projects');
    }
};

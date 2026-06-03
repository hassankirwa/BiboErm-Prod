<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('field_installation_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('job_type', 40);
            $table->string('status', 32)->default('scheduled');
            $table->foreignId('team_lead_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('scheduled_start')->nullable();
            $table->date('scheduled_end')->nullable();
            $table->timestamp('actual_start')->nullable();
            $table->timestamp('actual_end')->nullable();
            $table->decimal('percent_complete', 5, 2)->default(0);
            $table->text('site_address')->nullable();
            $table->string('site_contact_name', 120)->nullable();
            $table->string('site_contact_phone', 30)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
        });

        Schema::create('field_installation_job_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 50)->default('engineer');
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('removed_at')->nullable();
            $table->unique(['job_id', 'user_id']);
        });

        Schema::create('field_installation_daily_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->date('log_date');
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->text('summary');
            $table->unsignedInteger('units_completed')->default(0);
            $table->decimal('percent_today', 5, 2)->nullable();
            $table->string('weather', 80)->nullable();
            $table->text('site_conditions')->nullable();
            $table->text('blockers')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->unique(['job_id', 'log_date', 'submitted_by']);
            $table->index(['job_id', 'log_date']);
        });

        Schema::create('field_installation_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('field_installation_jobs')->cascadeOnDelete();
            $table->string('attachable_type', 40);
            $table->unsignedBigInteger('attachable_id');
            $table->string('file_path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->text('caption')->nullable();
            $table->timestamp('taken_at')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at');

            $table->index(['attachable_type', 'attachable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_installation_photos');
        Schema::dropIfExists('field_installation_daily_logs');
        Schema::dropIfExists('field_installation_job_members');
        Schema::dropIfExists('field_installation_jobs');
    }
};

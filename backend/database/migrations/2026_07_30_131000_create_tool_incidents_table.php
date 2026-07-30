<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tool_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tool_id')->constrained('warehouse_tools')->restrictOnDelete();
            $table->foreignId('issuance_id')->nullable()->constrained('tool_issuances')->nullOnDelete();
            $table->foreignId('field_job_id')->nullable()->constrained('field_installation_jobs')->nullOnDelete();
            $table->foreignId('responsible_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('reported_by')->constrained('users')->restrictOnDelete();
            $table->string('type', 30);
            $table->string('status', 30)->default('open');
            $table->text('notes')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->foreignId('replacement_tool_id')->nullable()->constrained('warehouse_tools')->nullOnDelete();
            $table->timestamps();

            $table->index('tool_id');
            $table->index('status');
            $table->index('type');
            $table->index('responsible_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tool_incidents');
    }
};

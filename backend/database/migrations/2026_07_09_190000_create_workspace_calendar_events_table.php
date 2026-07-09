<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('event_type', 64)->default('custom');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location', 500)->nullable();
            $table->string('visibility', 32)->default('private');
            $table->nullableMorphs('activitable');
            $table->timestamps();

            $table->index(['assigned_to', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_calendar_events');
    }
};

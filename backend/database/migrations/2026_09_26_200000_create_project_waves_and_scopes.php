<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_waves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedInteger('wave_number');
            $table->string('label', 120)->nullable();
            $table->string('status', 32)->default('planned');
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->string('stage', 64)->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'wave_number']);
            $table->index(['project_id', 'status']);
        });

        Schema::create('project_scopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('project_wave_id')->nullable()->constrained('project_waves')->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('project_scopes')->nullOnDelete();
            $table->foreignId('project_floor_id')->nullable()->constrained('project_floors')->nullOnDelete();
            $table->string('type', 32); // floor | room | custom
            $table->string('label', 120);
            $table->string('room_key', 120)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('stage', 64)->nullable();
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->unsignedInteger('openings_total')->default(0);
            $table->unsignedInteger('openings_done')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'project_wave_id']);
            $table->index(['project_id', 'type']);
            $table->index(['project_id', 'type', 'label']);
        });

        Schema::table('project_floors', function (Blueprint $table) {
            if (! Schema::hasColumn('project_floors', 'project_scope_id')) {
                $table->foreignId('project_scope_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('project_scopes')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_floors', function (Blueprint $table) {
            if (Schema::hasColumn('project_floors', 'project_scope_id')) {
                $table->dropConstrainedForeignId('project_scope_id');
            }
        });

        Schema::dropIfExists('project_scopes');
        Schema::dropIfExists('project_waves');
    }
};

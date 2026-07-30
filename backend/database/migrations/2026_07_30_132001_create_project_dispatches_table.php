<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('procurement_drivers')->restrictOnDelete();
            $table->string('status', 32);
            $table->string('vehicle_reg')->nullable();
            $table->text('vehicle_details')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->text('packing_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('driver_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_dispatches');
    }
};

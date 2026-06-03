<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procurement_drivers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('license_number', 100)->nullable();
            $table->string('vehicle_registration', 100)->nullable();
            $table->string('vehicle_type', 64)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
        });

        Schema::table('transport_orders', function (Blueprint $table) {
            $table->foreignId('driver_id')
                ->nullable()
                ->after('vehicle')
                ->constrained('procurement_drivers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transport_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('driver_id');
        });

        Schema::dropIfExists('procurement_drivers');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_pay_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('category', 40);
            $table->string('label')->nullable();
            $table->decimal('amount', 12, 2);
            $table->boolean('is_recurring')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('reference', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'kind']);
            $table->index(
                ['user_id', 'effective_from', 'effective_to'],
                'employee_pay_components_effective_dates_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_pay_components');
    }
};

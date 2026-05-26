<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('measurement_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('measurement_lines', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        Schema::table('deal_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('deal_payments', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        Schema::table('quotation_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('quotation_lines', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    public function down(): void
    {
        Schema::table('measurement_lines', function (Blueprint $table) {
            if (Schema::hasColumn('measurement_lines', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
        });

        Schema::table('deal_payments', function (Blueprint $table) {
            if (Schema::hasColumn('deal_payments', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
        });

        Schema::table('quotation_lines', function (Blueprint $table) {
            if (Schema::hasColumn('quotation_lines', 'created_at')) {
                $table->dropTimestamps();
            }
        });
    }
};

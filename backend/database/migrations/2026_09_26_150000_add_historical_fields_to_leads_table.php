<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->decimal('amount_paid', 15, 2)->nullable()->after('estimated_value');
            $table->date('quote_date')->nullable()->after('amount_paid');
            $table->string('external_quote_no', 64)->nullable()->after('quote_date');
            $table->boolean('is_historical')->default(false)->after('external_quote_no');

            $table->index('external_quote_no');
            $table->index('is_historical');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['external_quote_no']);
            $table->dropIndex(['is_historical']);
            $table->dropColumn([
                'amount_paid',
                'quote_date',
                'external_quote_no',
                'is_historical',
            ]);
        });
    }
};

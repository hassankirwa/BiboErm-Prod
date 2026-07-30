<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_reservations', function (Blueprint $table) {
            if (! Schema::hasColumn('stock_reservations', 'received_by')) {
                $table->foreignId('received_by')->nullable()->after('reserved_by')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('stock_reservations', 'released_at')) {
                $table->timestamp('released_at')->nullable()->after('reserved_at');
            }
            if (! Schema::hasColumn('stock_reservations', 'release_notes')) {
                $table->text('release_notes')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_reservations', function (Blueprint $table) {
            if (Schema::hasColumn('stock_reservations', 'received_by')) {
                $table->dropConstrainedForeignId('received_by');
            }
            if (Schema::hasColumn('stock_reservations', 'released_at')) {
                $table->dropColumn('released_at');
            }
            if (Schema::hasColumn('stock_reservations', 'release_notes')) {
                $table->dropColumn('release_notes');
            }
        });
    }
};

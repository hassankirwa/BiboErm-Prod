<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_documents', function (Blueprint $table) {
            $table->string('filename')->nullable()->after('title');
            $table->string('mime_type', 100)->nullable()->after('file_path');
            $table->unsignedBigInteger('file_size')->nullable()->after('mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('hr_documents', function (Blueprint $table) {
            $table->dropColumn(['filename', 'mime_type', 'file_size']);
        });
    }
};

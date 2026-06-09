<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_building_construction_stages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('label', 100);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        $stages = [
            ['slug' => 'planning_design', 'label' => 'Planning / design', 'sort_order' => 1],
            ['slug' => 'foundation', 'label' => 'Foundation', 'sort_order' => 2],
            ['slug' => 'structure_frame', 'label' => 'Structure / frame up', 'sort_order' => 3],
            ['slug' => 'roofing', 'label' => 'Roofing', 'sort_order' => 4],
            ['slug' => 'plastering', 'label' => 'Plastering / internal walls', 'sort_order' => 5],
            ['slug' => 'finishing_fit_out', 'label' => 'Finishing / fit-out', 'sort_order' => 6],
            ['slug' => 'completed_occupied', 'label' => 'Completed / occupied', 'sort_order' => 7],
            ['slug' => 'renovation', 'label' => 'Renovation in progress', 'sort_order' => 8],
            ['slug' => 'unknown', 'label' => 'Unknown / not discussed', 'sort_order' => 9],
        ];

        foreach ($stages as $stage) {
            DB::table('crm_building_construction_stages')->insert([
                ...$stage,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('building_construction_stage_id')
                ->nullable()
                ->after('property_site_type')
                ->constrained('crm_building_construction_stages')
                ->nullOnDelete();
        });

        Schema::create('lead_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('file_path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->string('caption', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('source_field_day_pin_photo_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('field_day_pin_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_day_pin_id')->constrained()->cascadeOnDelete();
            $table->string('file_path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->string('caption', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->timestamp('scheduled_start_at')->nullable()->after('due_at');
            $table->timestamp('scheduled_end_at')->nullable()->after('scheduled_start_at');
            $table->foreignId('account_id')->nullable()->after('deal_id')->constrained('accounts')->nullOnDelete();
            $table->foreignId('site_visit_id')->nullable()->after('account_id')->constrained('site_visits')->nullOnDelete();
            $table->string('location', 500)->nullable()->after('site_visit_id');
            $table->unsignedSmallInteger('reminder_minutes_before')->nullable()->default(30)->after('location');
            $table->timestamp('cancelled_at')->nullable()->after('completed_at');
            $table->string('outcome', 50)->nullable()->after('description');
            $table->unsignedSmallInteger('duration_minutes')->nullable()->after('outcome');
            $table->string('recipient', 255)->nullable()->after('duration_minutes');
        });

        Schema::table('site_visits', function (Blueprint $table) {
            $table->boolean('requires_measurements')->default(true)->after('visit_purpose');
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropForeign(['deal_id']);
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->unsignedBigInteger('deal_id')->nullable()->change();
            $table->foreign('deal_id')->references('id')->on('deals')->nullOnDelete();
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('stage');
        });

        Schema::create('account_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('filename');
            $table->string('file_path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                if (! Schema::hasColumn('accounts', 'building_construction_stage_id')) {
                    $table->foreignId('building_construction_stage_id')
                        ->nullable()
                        ->constrained('crm_building_construction_stages')
                        ->nullOnDelete();
                }
            });
        }

        DB::table('crm_visit_purposes')->updateOrInsert(
            ['slug' => 'assessment'],
            ['label' => 'Assessment', 'is_active' => true, 'updated_at' => $now, 'created_at' => $now]
        );
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (Schema::hasColumn('accounts', 'building_construction_stage_id')) {
                $table->dropConstrainedForeignId('building_construction_stage_id');
            }
        });

        Schema::dropIfExists('account_documents');

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });

        Schema::table('site_visits', function (Blueprint $table) {
            $table->dropColumn('requires_measurements');
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
            $table->dropConstrainedForeignId('site_visit_id');
            $table->dropColumn([
                'scheduled_start_at',
                'scheduled_end_at',
                'location',
                'reminder_minutes_before',
                'cancelled_at',
                'outcome',
                'duration_minutes',
                'recipient',
            ]);
        });

        Schema::dropIfExists('field_day_pin_photos');
        Schema::dropIfExists('lead_photos');

        Schema::table('leads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('building_construction_stage_id');
        });

        Schema::dropIfExists('crm_building_construction_stages');
    }
};

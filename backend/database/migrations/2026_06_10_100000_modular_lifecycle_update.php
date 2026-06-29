<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('pipeline_stage', 50)->nullable()->after('status')->index();
        });

        Schema::table('site_visits', function (Blueprint $table) {
            $table->foreignId('assigned_to_user_id')->nullable()->after('assigned_field_officer_id')->constrained('users')->nullOnDelete();
            $table->string('visit_type', 50)->nullable()->after('visit_purpose');
            $table->string('building_type', 100)->nullable();
            $table->string('floor_level', 50)->nullable();
            $table->string('room_area', 255)->nullable();
            $table->string('site_condition', 100)->nullable();
            $table->text('access_notes')->nullable();
            $table->text('parking_security_notes')->nullable();
            $table->string('lift_stair_access', 100)->nullable();
            $table->string('power_availability', 100)->nullable();
            $table->text('installation_access_notes')->nullable();
            $table->text('special_risks')->nullable();
            $table->text('general_notes')->nullable();
            $table->string('gps_start', 255)->nullable();
            $table->string('gps_end', 255)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        });

        DB::table('site_visits')
            ->whereNotNull('assigned_field_officer_id')
            ->whereNull('assigned_to_user_id')
            ->update([
                'assigned_to_user_id' => DB::raw('assigned_field_officer_id'),
            ]);

        Schema::create('measured_openings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visit_id')->constrained()->cascadeOnDelete();
            $table->string('opening_code', 50);
            $table->string('opening_type', 50)->nullable();
            $table->string('floor', 50)->nullable();
            $table->string('room_area', 255)->nullable();
            $table->decimal('width_mm', 10, 2)->nullable();
            $table->decimal('height_mm', 10, 2)->nullable();
            $table->decimal('depth_mm', 10, 2)->nullable();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('sill_height_mm', 10, 2)->nullable();
            $table->string('wall_condition', 100)->nullable();
            $table->string('frame_condition', 100)->nullable();
            $table->string('product_type', 100)->nullable();
            $table->string('glass_preference', 100)->nullable();
            $table->string('profile_preference', 100)->nullable();
            $table->string('finish_colour', 100)->nullable();
            $table->string('opening_direction', 50)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['site_visit_id', 'opening_code']);
        });

        Schema::create('opening_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('measured_opening_id')->constrained()->cascadeOnDelete();
            $table->string('photo_path', 500);
            $table->string('photo_type', 50)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('measurement_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->string('report_number', 30)->unique();
            $table->string('status', 50)->default('pending_review');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('pdf_path', 500)->nullable();
            $table->string('excel_path', 500)->nullable();
            $table->string('photos_zip_path', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('design_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('design_job_number', 30)->unique();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('site_visit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('measurement_report_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_designer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 50)->default('design_required');
            $table->timestamp('downloaded_at')->nullable();
            $table->timestamp('design_started_at')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('design_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('design_job_id')->constrained()->cascadeOnDelete();
            $table->string('file_type', 50);
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at')->nullable();
            $table->string('parsed_status', 50)->nullable();
            $table->json('parsed_metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('extracted_design_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('design_job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_file_id')->nullable()->constrained('design_files')->nullOnDelete();
            $table->string('item_type', 50)->nullable();
            $table->string('wd_code', 50)->nullable();
            $table->string('name', 255)->nullable();
            $table->string('code_no', 50)->nullable();
            $table->decimal('length', 10, 2)->nullable();
            $table->unsignedInteger('quantity')->nullable();
            $table->decimal('kg_per_meter', 10, 4)->nullable();
            $table->string('colour', 100)->nullable();
            $table->text('specification')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('quotation_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number', 30)->unique();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('design_job_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('measurement_report_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 50)->default('pending');
            $table->foreignId('assigned_quotation_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->foreignId('design_job_id')->nullable()->after('contact_id')->constrained()->nullOnDelete();
            $table->foreignId('quotation_request_id')->nullable()->after('design_job_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quotation_request_id');
            $table->dropConstrainedForeignId('design_job_id');
        });

        Schema::dropIfExists('quotation_requests');
        Schema::dropIfExists('extracted_design_items');
        Schema::dropIfExists('design_files');
        Schema::dropIfExists('design_jobs');
        Schema::dropIfExists('measurement_reports');
        Schema::dropIfExists('opening_photos');
        Schema::dropIfExists('measured_openings');

        Schema::table('site_visits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'assigned_to_user_id',
                'visit_type',
                'building_type',
                'floor_level',
                'room_area',
                'site_condition',
                'access_notes',
                'parking_security_notes',
                'lift_stair_access',
                'power_availability',
                'installation_access_notes',
                'special_risks',
                'general_notes',
                'gps_start',
                'gps_end',
                'submitted_at',
                'reviewed_at',
            ]);
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('pipeline_stage');
        });
    }
};

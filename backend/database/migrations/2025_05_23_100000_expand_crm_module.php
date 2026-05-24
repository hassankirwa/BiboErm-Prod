<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_lead_sources', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_lead_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_product_interests', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_counties', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_loss_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_visit_purposes', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->string('account_number', 30)->nullable()->unique()->after('id');
            $table->string('account_type', 50)->nullable()->after('name');
            $table->string('kra_pin', 50)->nullable()->after('website');
            $table->text('physical_address')->nullable()->after('billing_address');
            $table->unsignedBigInteger('county_id')->nullable()->after('physical_address');
            $table->string('status', 50)->default('prospect')->after('county_id');
            $table->foreignId('account_owner_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('primary_contact_id')->nullable()->after('account_owner_id');
            $table->unsignedBigInteger('source_lead_id')->nullable()->after('primary_contact_id');
            $table->foreignId('created_by')->nullable()->after('source_lead_id')->constrained('users')->nullOnDelete();
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->string('contact_number', 30)->nullable()->unique()->after('id');
            $table->string('name')->nullable()->after('contact_number');
            $table->string('whatsapp', 50)->nullable()->after('phone');
            $table->string('preferred_contact_method', 30)->nullable()->after('job_title');
            $table->string('status', 50)->default('new_contact')->after('preferred_contact_method');
            $table->foreignId('contact_owner_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('source_lead_id')->nullable()->after('contact_owner_id');
            $table->text('notes')->nullable()->after('source_lead_id');
            $table->foreignId('created_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('lead_number', 30)->nullable()->unique()->after('id');
            $table->string('name')->nullable()->after('lead_number');
            $table->foreignId('lead_type_id')->nullable()->after('name')->constrained('crm_lead_types')->nullOnDelete();
            $table->foreignId('lead_source_id')->nullable()->after('lead_type_id')->constrained('crm_lead_sources')->nullOnDelete();
            $table->string('priority', 20)->nullable()->after('status');
            $table->foreignId('lead_owner_id')->nullable()->after('priority')->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_sales_user_id')->nullable()->after('lead_owner_id')->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_field_officer_id')->nullable()->after('assigned_sales_user_id')->constrained('users')->nullOnDelete();
            $table->string('contact_person_name')->nullable()->after('assigned_field_officer_id');
            $table->string('whatsapp', 50)->nullable()->after('phone');
            $table->string('job_title', 100)->nullable()->after('email');
            $table->string('preferred_contact_method', 30)->nullable()->after('job_title');
            $table->string('preferred_contact_time', 50)->nullable()->after('preferred_contact_method');
            $table->string('account_name')->nullable()->after('preferred_contact_time');
            $table->string('account_type', 50)->nullable()->after('account_name');
            $table->string('industry', 100)->nullable()->after('account_type');
            $table->string('company_phone', 50)->nullable()->after('industry');
            $table->string('company_email')->nullable()->after('company_phone');
            $table->string('website')->nullable()->after('company_email');
            $table->string('kra_pin', 50)->nullable()->after('website');
            $table->text('billing_address')->nullable()->after('kra_pin');
            $table->json('product_interests')->nullable()->after('billing_address');
            $table->text('requirement_description')->nullable()->after('product_interests');
            $table->string('property_site_type', 50)->nullable()->after('requirement_description');
            $table->string('estimated_scope')->nullable()->after('property_site_type');
            $table->decimal('estimated_budget', 15, 2)->nullable()->after('estimated_scope');
            $table->string('expected_timeline', 50)->nullable()->after('estimated_budget');
            $table->string('urgency', 20)->nullable()->after('expected_timeline');
            $table->string('site_name')->nullable()->after('urgency');
            $table->text('site_address')->nullable()->after('site_name');
            $table->unsignedBigInteger('county_id')->nullable()->after('site_address');
            $table->string('area_estate', 100)->nullable()->after('county_id');
            $table->string('landmark')->nullable()->after('area_estate');
            $table->string('site_contact_name')->nullable()->after('landmark');
            $table->string('site_contact_phone', 50)->nullable()->after('site_contact_name');
            $table->string('has_budget', 20)->nullable()->after('site_contact_phone');
            $table->string('decision_maker_identified', 20)->nullable()->after('has_budget');
            $table->string('has_existing_supplier', 20)->nullable()->after('decision_maker_identified');
            $table->boolean('need_site_visit')->default(false)->after('has_existing_supplier');
            $table->date('expected_decision_date')->nullable()->after('need_site_visit');
            $table->string('lead_quality_score', 20)->nullable()->after('expected_decision_date');
            $table->text('qualification_notes')->nullable()->after('lead_quality_score');
            $table->string('next_action', 50)->nullable()->after('qualification_notes');
            $table->timestamp('next_follow_up_at')->nullable()->after('next_action');
            $table->text('internal_notes')->nullable()->after('next_follow_up_at');
            $table->unsignedBigInteger('converted_deal_id')->nullable()->after('converted_at');
            $table->foreignId('created_by')->nullable()->after('converted_deal_id')->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->string('deal_number', 30)->nullable()->unique()->after('id');
            $table->string('name')->nullable()->after('deal_number');
            $table->unsignedBigInteger('source_lead_id')->nullable()->after('lead_id');
            $table->foreignId('deal_owner_id')->nullable()->after('source_lead_id')->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_field_officer_id')->nullable()->after('deal_owner_id')->constrained('users')->nullOnDelete();
            $table->foreignId('primary_contact_id')->nullable()->after('assigned_field_officer_id')->constrained('contacts')->nullOnDelete();
            $table->json('product_interests')->nullable()->after('stage');
            $table->text('requirement_summary')->nullable()->after('product_interests');
            $table->text('site_address')->nullable()->after('requirement_summary');
            $table->decimal('latitude', 10, 7)->nullable()->after('site_address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->decimal('estimated_value', 15, 2)->nullable()->after('longitude');
            $table->unsignedSmallInteger('probability')->nullable()->after('expected_close_date');
            $table->decimal('quotation_amount', 15, 2)->nullable()->after('probability');
            $table->decimal('discount_requested', 15, 2)->nullable()->after('quotation_amount');
            $table->decimal('final_agreed_amount', 15, 2)->nullable()->after('discount_requested');
            $table->decimal('deposit_required_percent', 5, 2)->nullable()->after('final_agreed_amount');
            $table->decimal('deposit_required_amount', 15, 2)->nullable()->after('deposit_required_percent');
            $table->decimal('deposit_paid_amount', 15, 2)->default(0)->after('deposit_required_amount');
            $table->string('payment_status', 30)->default('not_paid')->after('deposit_paid_amount');
            $table->date('expected_installation_date')->nullable()->after('payment_status');
            $table->string('competitor')->nullable()->after('expected_installation_date');
            $table->foreignId('loss_reason_id')->nullable()->after('competitor')->constrained('crm_loss_reasons')->nullOnDelete();
            $table->text('loss_notes')->nullable()->after('loss_reason_id');
            $table->foreignId('created_by')->nullable()->after('project_id')->constrained('users')->nullOnDelete();
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->string('activity_type', 30)->nullable()->after('id');
            $table->text('description')->nullable()->after('subject');
            $table->unsignedBigInteger('lead_id')->nullable()->after('completed_at');
            $table->unsignedBigInteger('contact_id')->nullable()->after('lead_id');
            $table->unsignedBigInteger('deal_id')->nullable()->after('contact_id');
        });

        Schema::create('site_visits', function (Blueprint $table) {
            $table->id();
            $table->string('visit_number', 30)->unique();
            $table->string('title');
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->text('site_address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->foreignId('assigned_field_officer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('scheduled_by')->constrained('users')->cascadeOnDelete();
            $table->date('visit_date');
            $table->time('visit_time')->nullable();
            $table->string('visit_purpose', 50)->nullable();
            $table->string('status', 50)->default('scheduled');
            $table->text('notes_for_field_officer')->nullable();
            $table->decimal('actual_latitude', 10, 7)->nullable();
            $table->decimal('actual_longitude', 10, 7)->nullable();
            $table->timestamp('arrival_at')->nullable();
            $table->timestamp('completion_at')->nullable();
            $table->boolean('client_present')->nullable();
            $table->string('visit_outcome', 50)->nullable();
            $table->boolean('follow_up_required')->nullable();
            $table->text('field_officer_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('measurement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visit_id')->constrained()->cascadeOnDelete();
            $table->string('room_area_name');
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('material_preference', 100)->nullable();
            $table->text('installation_notes')->nullable();
            $table->text('obstacles_notes')->nullable();
            $table->text('client_comments')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('site_visit_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visit_id')->constrained()->cascadeOnDelete();
            $table->string('file_path', 500)->nullable();
            $table->string('firebase_url', 500)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number', 30)->unique();
            $table->foreignId('deal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('prepared_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 50)->default('draft');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->date('valid_until')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('revision_of_id')->nullable()->constrained('quotations')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quotation_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('line_total', 15, 2);
            $table->foreignId('measurement_line_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::create('deal_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quotation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_reference', 100);
            $table->date('payment_date');
            $table->decimal('amount_paid', 15, 2);
            $table->string('payment_method', 30);
            $table->string('payment_status', 30);
            $table->foreignId('received_by')->constrained('users')->cascadeOnDelete();
            $table->string('proof_file_path', 500)->nullable();
            $table->string('proof_firebase_url', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('field_days', function (Blueprint $table) {
            $table->id();
            $table->date('field_date');
            $table->foreignId('field_officer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('field_day_pins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_day_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('lead_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('file_path', 500)->nullable();
            $table->string('firebase_url', 500)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->foreign('county_id')->references('id')->on('crm_counties')->nullOnDelete();
            $table->foreign('primary_contact_id')->references('id')->on('contacts')->nullOnDelete();
            $table->foreign('source_lead_id')->references('id')->on('leads')->nullOnDelete();
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->foreign('source_lead_id')->references('id')->on('leads')->nullOnDelete();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreign('county_id')->references('id')->on('crm_counties')->nullOnDelete();
            $table->foreign('converted_deal_id')->references('id')->on('deals')->nullOnDelete();
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->foreign('source_lead_id')->references('id')->on('leads')->nullOnDelete();
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->foreign('lead_id')->references('id')->on('leads')->nullOnDelete();
            $table->foreign('contact_id')->references('id')->on('contacts')->nullOnDelete();
            $table->foreign('deal_id')->references('id')->on('deals')->nullOnDelete();
        });

        $this->backfillLegacyData();
    }

    protected function backfillLegacyData(): void
    {
        foreach (DB::table('leads')->orderBy('id')->cursor() as $lead) {
            $name = trim(($lead->first_name ?? '').' '.($lead->last_name ?? ''));
            DB::table('leads')->where('id', $lead->id)->update([
                'lead_number' => $lead->reference,
                'name' => $name !== '' ? $name : ($lead->company ?? 'Lead #'.$lead->id),
                'contact_person_name' => $name !== '' ? $name : null,
                'lead_owner_id' => $lead->assigned_to,
                'assigned_sales_user_id' => $lead->assigned_to,
                'account_name' => $lead->company,
                'requirement_description' => $lead->notes,
                'estimated_budget' => $lead->estimated_value,
            ]);
        }

        foreach (DB::table('contacts')->orderBy('id')->cursor() as $contact) {
            $name = trim(($contact->first_name ?? '').' '.($contact->last_name ?? ''));
            DB::table('contacts')->where('id', $contact->id)->update([
                'name' => $name !== '' ? $name : 'Contact #'.$contact->id,
                'contact_owner_id' => $contact->owner_id,
            ]);
        }

        foreach (DB::table('accounts')->orderBy('id')->cursor() as $account) {
            DB::table('accounts')->where('id', $account->id)->update([
                'account_owner_id' => $account->owner_id,
            ]);
        }

        foreach (DB::table('deals')->orderBy('id')->cursor() as $deal) {
            DB::table('deals')->where('id', $deal->id)->update([
                'deal_number' => $deal->reference,
                'name' => $deal->title,
                'source_lead_id' => $deal->lead_id,
                'deal_owner_id' => $deal->owner_id,
                'primary_contact_id' => $deal->contact_id,
                'estimated_value' => $deal->amount,
                'deposit_required_amount' => $deal->deposit_amount,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_attachments');
        Schema::dropIfExists('field_day_pins');
        Schema::dropIfExists('field_days');
        Schema::dropIfExists('deal_payments');
        Schema::dropIfExists('quotation_lines');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('site_visit_photos');
        Schema::dropIfExists('measurement_lines');
        Schema::dropIfExists('site_visits');

        Schema::dropIfExists('crm_visit_purposes');
        Schema::dropIfExists('crm_loss_reasons');
        Schema::dropIfExists('crm_counties');
        Schema::dropIfExists('crm_product_interests');
        Schema::dropIfExists('crm_lead_types');
        Schema::dropIfExists('crm_lead_sources');
    }
};

<?php

namespace App\Models;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Support\Crm\LeadAccountEligibility;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class Lead extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'reference', 'lead_number', 'name', 'first_name', 'last_name', 'company',
        'lead_type_id', 'lead_source_id', 'status', 'pipeline_stage', 'priority',
        'lead_owner_id', 'assigned_sales_user_id', 'assigned_field_officer_id', 'assigned_to',
        'contact_person_name', 'phone', 'whatsapp', 'email', 'job_title',
        'preferred_contact_method', 'preferred_contact_time',
        'account_name', 'account_type', 'industry', 'company_phone', 'company_email',
        'website', 'kra_pin', 'billing_address',
        'product_interests', 'requirement_description', 'property_site_type', 'building_construction_stage_id',
        'estimated_scope', 'estimated_budget', 'estimated_value', 'expected_timeline', 'urgency',
        'site_name', 'site_address', 'county_id', 'subcounty', 'ward', 'area_estate', 'latitude', 'longitude',
        'landmark', 'site_contact_name', 'site_contact_phone',
        'has_budget', 'decision_maker_identified', 'has_existing_supplier',
        'need_site_visit', 'expected_decision_date', 'lead_quality_score', 'qualification_notes',
        'next_action', 'next_follow_up_at', 'internal_notes', 'notes', 'source',
        'converted_contact_id', 'converted_account_id', 'converted_deal_id', 'converted_at',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => LeadStatus::class,
            'pipeline_stage' => LeadPipelineStage::class,
            'product_interests' => 'array',
            'need_site_visit' => 'boolean',
            'estimated_budget' => 'decimal:2',
            'estimated_value' => 'decimal:2',
            'expected_decision_date' => 'date',
            'next_follow_up_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function auditModule(): string
    {
        return 'crm';
    }

    public function leadOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_owner_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedSalesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_sales_user_id');
    }

    public function assignedFieldOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_field_officer_id');
    }

    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'lead_source_id');
    }

    public function sourceContact(): HasOne
    {
        return $this->hasOne(Contact::class, 'source_lead_id');
    }

    public function sourceContacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'source_lead_id');
    }

    /** @return Collection<int, Contact> */
    public function resolveLinkedContacts(): Collection
    {
        $contacts = collect();

        if ($this->relationLoaded('sourceContacts')) {
            $contacts = $contacts->merge($this->sourceContacts);
        }

        if ($this->relationLoaded('convertedContact') && $this->convertedContact) {
            $contacts->push($this->convertedContact);
        }

        if (
            $this->relationLoaded('convertedAccount')
            && $this->convertedAccount?->relationLoaded('contacts')
        ) {
            $contacts = $contacts->merge($this->convertedAccount->contacts);
        }

        return $contacts->unique('id')->values();
    }

    public function convertedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'converted_contact_id');
    }

    public function convertedAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'converted_account_id');
    }

    public function convertedDeal(): BelongsTo
    {
        return $this->belongsTo(Deal::class, 'converted_deal_id');
    }

    public function siteVisits(): HasMany
    {
        return $this->hasMany(SiteVisit::class);
    }

    public function measurementReports(): HasMany
    {
        return $this->hasMany(MeasurementReport::class);
    }

    public function designJobs(): HasMany
    {
        return $this->hasMany(DesignJob::class);
    }

    public function quotationRequests(): HasMany
    {
        return $this->hasMany(QuotationRequest::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(LeadAttachment::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(LeadPhoto::class);
    }

    public function buildingConstructionStage(): BelongsTo
    {
        return $this->belongsTo(BuildingConstructionStage::class, 'building_construction_stage_id');
    }

    public function isQualifiedForAccount(): bool
    {
        return LeadAccountEligibility::isQualifiedForAccount($this);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->can('leads.view_all')) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('lead_owner_id', $user->id)
                ->orWhere('assigned_sales_user_id', $user->id)
                ->orWhere('assigned_to', $user->id)
                ->orWhere('created_by', $user->id);
        });
    }
}

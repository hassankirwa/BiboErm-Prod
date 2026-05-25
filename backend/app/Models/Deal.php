<?php

namespace App\Models;

use App\Enums\Crm\DealStage;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deal extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'reference',
        'deal_number',
        'title',
        'name',
        'contact_id',
        'primary_contact_id',
        'account_id',
        'lead_id',
        'source_lead_id',
        'stage',
        'status',
        'amount',
        'estimated_value',
        'deposit_amount',
        'deposit_required_percent',
        'deposit_required_amount',
        'deposit_paid_amount',
        'payment_status',
        'expected_close_date',
        'expected_installation_date',
        'won_at',
        'lost_at',
        'lost_reason',
        'loss_reason_id',
        'loss_notes',
        'owner_id',
        'deal_owner_id',
        'assigned_field_officer_id',
        'project_id',
        'product_interests',
        'requirement_summary',
        'site_address',
        'latitude',
        'longitude',
        'probability',
        'quotation_amount',
        'discount_requested',
        'final_agreed_amount',
        'competitor',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'stage' => DealStage::class,
            'product_interests' => 'array',
            'amount' => 'decimal:2',
            'estimated_value' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'deposit_required_percent' => 'decimal:2',
            'deposit_required_amount' => 'decimal:2',
            'deposit_paid_amount' => 'decimal:2',
            'quotation_amount' => 'decimal:2',
            'discount_requested' => 'decimal:2',
            'final_agreed_amount' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'expected_close_date' => 'date',
            'expected_installation_date' => 'date',
            'won_at' => 'datetime',
            'lost_at' => 'datetime',
        ];
    }

    public function auditModule(): string
    {
        return 'crm';
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function primaryContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function sourceLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'source_lead_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function dealOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deal_owner_id');
    }

    public function assignedFieldOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_field_officer_id');
    }

    public function lossReason(): BelongsTo
    {
        return $this->belongsTo(CrmLossReason::class, 'loss_reason_id');
    }

    public function siteVisits(): HasMany
    {
        return $this->hasMany(SiteVisit::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DealPayment::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->can('deals.view_all') || $user->can('crm.manage')) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('deal_owner_id', $user->id)
                ->orWhere('owner_id', $user->id)
                ->orWhere('created_by', $user->id)
                ->orWhere('assigned_field_officer_id', $user->id);
        });
    }
}

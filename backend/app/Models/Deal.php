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
        'site_assessment',
    ];

    protected function casts(): array
    {
        return [
            'stage' => DealStage::class,
            'product_interests' => 'array',
            'site_assessment' => 'array',
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

    public function latestQuotation(): ?Quotation
    {
        if ($this->relationLoaded('quotations')) {
            return $this->quotations
                ->filter(fn (Quotation $quotation): bool => ! ($quotation->is_reference_copy ?? false))
                ->sortByDesc('id')
                ->first();
        }

        return $this->quotations()
            ->excludingReferenceCopies()
            ->with('lines')
            ->latest('id')
            ->first();
    }

    public function hasUsdQuotationPricing(): bool
    {
        return (bool) $this->latestQuotation()?->hasUsdPricing();
    }

    /**
     * Convert a deal money field to KES when it was synced from a USD quotation total.
     */
    public function amountToKes(float|string|null $amount): ?float
    {
        if ($amount === null || $amount === '') {
            return null;
        }

        $value = round((float) $amount, 2);
        $quotation = $this->latestQuotation();

        if (! $quotation || ! $quotation->hasUsdPricing()) {
            return $value;
        }

        $usdTotal = round((float) $quotation->total_amount, 2);
        $kesTotal = $quotation->totalAmountKes();
        $rate = $quotation->usdToKesRate();

        // Already stored/displayed as the KES quotation total.
        if (abs($value - $kesTotal) < 1.0) {
            return $value;
        }

        // Copied directly from quotation.total_amount (USD).
        if (abs($value - $usdTotal) < 0.05) {
            return $kesTotal;
        }

        // Deal quotation_amount still holds the USD total → treat sibling synced fields as USD.
        $storedQuoteAmount = $this->quotation_amount !== null ? round((float) $this->quotation_amount, 2) : null;
        if ($storedQuoteAmount !== null && abs($storedQuoteAmount - $usdTotal) < 0.05) {
            return round($value * $rate, 2);
        }

        return $value;
    }

    public function displayValueKes(): float
    {
        $raw = $this->final_agreed_amount
            ?? $this->quotation_amount
            ?? $this->estimated_value
            ?? $this->amount
            ?? 0;

        return $this->amountToKes($raw) ?? 0.0;
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
        if ($user->can('deals.view_all')) {
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

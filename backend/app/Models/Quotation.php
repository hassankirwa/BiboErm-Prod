<?php

namespace App\Models;

use App\Enums\Crm\QuotationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number', 'deal_id', 'account_id', 'contact_id', 'design_job_id',
        'quotation_request_id', 'prepared_by',
        'project_name', 'project_number',
        'status', 'subtotal', 'discount_amount', 'tax_amount', 'tax_rate', 'total_amount',
        'valid_until', 'terms_conditions', 'source_excel_path', 'sent_at', 'approved_at', 'approved_by', 'accepted_at',
        'revision_of_id', 'revision_number', 'is_reference_copy', 'root_quotation_id', 'negotiation_notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => QuotationStatus::class,
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'valid_until' => 'date',
            'sent_at' => 'datetime',
            'approved_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revision_number' => 'integer',
            'is_reference_copy' => 'boolean',
            'negotiation_notes' => 'array',
        ];
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function designJob(): BelongsTo
    {
        return $this->belongsTo(DesignJob::class);
    }

    public function quotationRequest(): BelongsTo
    {
        return $this->belongsTo(QuotationRequest::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(QuotationLine::class);
    }

    public function rootQuotation(): BelongsTo
    {
        return $this->belongsTo(self::class, 'root_quotation_id');
    }

    public function revisionOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'revision_of_id');
    }

    public function referenceCopies(): HasMany
    {
        $rootId = $this->root_quotation_id ?? $this->id;

        return $this->hasMany(self::class, 'root_quotation_id', 'root_quotation_id')
            ->where('is_reference_copy', true)
            ->where('root_quotation_id', $rootId);
    }

    public function scopeExcludingReferenceCopies(Builder $query): Builder
    {
        return $query->where('is_reference_copy', false);
    }

    public function threadRootId(): int
    {
        return (int) ($this->root_quotation_id ?? $this->id);
    }

    public function revisionLabel(): string
    {
        return 'v'.$this->revision_number;
    }

    /**
     * Accounting extracts often store line prices in USD; CRM/UI should show KES.
     */
    public function hasUsdPricing(): bool
    {
        $this->loadMissing('lines');

        foreach ($this->lines as $line) {
            $accounting = is_array($line->metadata) ? ($line->metadata['accounting'] ?? null) : null;
            if (! is_array($accounting)) {
                continue;
            }
            if (($accounting['currency'] ?? null) === 'KES') {
                continue;
            }
            if (($accounting['currency'] ?? null) === 'USD') {
                return true;
            }
            if (($accounting['unit_price_usd'] ?? null) !== null || ($accounting['line_total_usd'] ?? null) !== null) {
                return true;
            }
        }

        return false;
    }

    public function usdToKesRate(): float
    {
        return (float) config('bibo.quotation.usd_to_kes_rate', 129.0);
    }

    /**
     * Display total in KES (converts stored USD totals when lines are USD-priced).
     */
    public function totalAmountKes(?float $rate = null): float
    {
        $total = (float) $this->total_amount;
        if (! $this->hasUsdPricing()) {
            return round($total, 2);
        }

        $rate ??= $this->usdToKesRate();

        return round($total * max($rate, 0), 2);
    }
}

<?php

namespace App\Models;

use App\Enums\Design\DesignJobStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DesignJob extends Model
{
    protected $fillable = [
        'design_job_number', 'lead_id', 'site_visit_id', 'measurement_report_id',
        'assigned_designer_id', 'status', 'downloaded_at', 'design_started_at',
        'uploaded_at', 'reviewed_at', 'approved_at', 'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => DesignJobStatus::class,
            'downloaded_at' => 'datetime',
            'design_started_at' => 'datetime',
            'uploaded_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function siteVisit(): BelongsTo
    {
        return $this->belongsTo(SiteVisit::class);
    }

    public function measurementReport(): BelongsTo
    {
        return $this->belongsTo(MeasurementReport::class);
    }

    public function assignedDesigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_designer_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DesignFile::class);
    }

    public function extractedItems(): HasMany
    {
        return $this->hasMany(ExtractedDesignItem::class);
    }

    public function quotationRequest(): HasOne
    {
        return $this->hasOne(QuotationRequest::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }
}

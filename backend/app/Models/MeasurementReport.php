<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MeasurementReport extends Model
{
    protected $fillable = [
        'site_visit_id', 'lead_id', 'report_number', 'status',
        'submitted_by', 'reviewed_by', 'approved_at',
        'pdf_path', 'excel_path', 'photos_zip_path',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function siteVisit(): BelongsTo
    {
        return $this->belongsTo(SiteVisit::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function designJob(): HasOne
    {
        return $this->hasOne(DesignJob::class);
    }

    public function quotationRequests(): HasMany
    {
        return $this->hasMany(QuotationRequest::class);
    }
}

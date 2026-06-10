<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuotationRequest extends Model
{
    protected $fillable = [
        'request_number', 'lead_id', 'design_job_id', 'measurement_report_id',
        'status', 'assigned_quotation_user_id',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function designJob(): BelongsTo
    {
        return $this->belongsTo(DesignJob::class);
    }

    public function measurementReport(): BelongsTo
    {
        return $this->belongsTo(MeasurementReport::class);
    }

    public function assignedQuotationUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_quotation_user_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldDayPin extends Model
{
    protected $fillable = [
        'field_day_id',
        'lead_id',
        'contact_id',
        'latitude',
        'longitude',
        'accuracy_m',
        'captured_at',
        'notes',
        'findings',
        'site_label',
        'county_id',
        'subcounty',
        'ward',
        'location_address',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
        ];
    }

    public function fieldDay(): BelongsTo
    {
        return $this->belongsTo(FieldDay::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function county(): BelongsTo
    {
        return $this->belongsTo(CrmCounty::class, 'county_id');
    }
}

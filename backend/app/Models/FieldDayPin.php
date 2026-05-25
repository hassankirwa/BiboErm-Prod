<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldDayPin extends Model
{
    protected $fillable = [
        'field_day_id', 'lead_id', 'contact_id', 'latitude', 'longitude', 'notes',
    ];

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
}

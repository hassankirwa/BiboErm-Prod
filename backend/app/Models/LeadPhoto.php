<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPhoto extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lead_id',
        'file_path',
        'firebase_url',
        'caption',
        'sort_order',
        'uploaded_by',
        'source_field_day_pin_photo_id',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

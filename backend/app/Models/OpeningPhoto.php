<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpeningPhoto extends Model
{
    protected $fillable = [
        'measured_opening_id', 'photo_path', 'photo_type', 'uploaded_by', 'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
        ];
    }

    public function measuredOpening(): BelongsTo
    {
        return $this->belongsTo(MeasuredOpening::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

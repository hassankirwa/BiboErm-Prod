<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldDayPinPhoto extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'field_day_pin_id',
        'file_path',
        'firebase_url',
        'caption',
        'sort_order',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function pin(): BelongsTo
    {
        return $this->belongsTo(FieldDayPin::class, 'field_day_pin_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

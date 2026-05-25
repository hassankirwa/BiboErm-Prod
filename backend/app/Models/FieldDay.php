<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FieldDay extends Model
{
    protected $fillable = [
        'field_date', 'field_officer_id', 'created_by', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'field_date' => 'date',
        ];
    }

    public function fieldOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'field_officer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function pins(): HasMany
    {
        return $this->hasMany(FieldDayPin::class);
    }
}

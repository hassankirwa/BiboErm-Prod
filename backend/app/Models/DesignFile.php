<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DesignFile extends Model
{
    protected $fillable = [
        'design_job_id', 'file_type', 'file_name', 'file_path',
        'uploaded_by', 'uploaded_at', 'parsed_status', 'parsed_metadata',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
            'parsed_metadata' => 'array',
        ];
    }

    public function designJob(): BelongsTo
    {
        return $this->belongsTo(DesignJob::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function extractedItems(): HasMany
    {
        return $this->hasMany(ExtractedDesignItem::class, 'source_file_id');
    }
}

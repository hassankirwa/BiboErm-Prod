<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExtractedDesignItem extends Model
{
    protected $fillable = [
        'design_job_id', 'source_file_id', 'item_type', 'wd_code', 'name', 'code_no',
        'length', 'quantity', 'kg_per_meter', 'colour', 'specification', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'length' => 'decimal:2',
            'quantity' => 'integer',
            'kg_per_meter' => 'decimal:4',
        ];
    }

    public function designJob(): BelongsTo
    {
        return $this->belongsTo(DesignJob::class);
    }

    public function sourceFile(): BelongsTo
    {
        return $this->belongsTo(DesignFile::class, 'source_file_id');
    }
}

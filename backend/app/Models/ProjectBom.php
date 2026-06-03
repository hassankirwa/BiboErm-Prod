<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectBom extends Model
{
    protected $fillable = [
        'project_id',
        'version',
        'status',
        'uploaded_by',
        'source_file_path',
        'source_firebase_url',
        'finalized_at',
        'finalized_by',
        'notes',
        'extracted_data',
    ];

    protected function casts(): array
    {
        return [
            'finalized_at' => 'datetime',
            'extracted_data' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ProjectBomLine::class, 'bom_id')->orderBy('sort_order');
    }
}

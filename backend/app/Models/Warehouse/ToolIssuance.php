<?php

namespace App\Models\Warehouse;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToolIssuance extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'tool_id',
        'project_id',
        'issued_to',
        'issued_by',
        'issue_date',
        'return_date',
        'condition_out',
        'condition_in',
        'damage_notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'return_date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class, 'tool_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function issuedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_to');
    }

    public function issuedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}

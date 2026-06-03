<?php

namespace App\Models\FieldInstallation;

use App\Models\User;
use App\Models\Warehouse\ToolIssuance;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldToolAssignment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'job_id',
        'tool_issuance_id',
        'assigned_by',
        'expected_return_date',
        'returned_at',
        'notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_return_date' => 'date',
            'returned_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function toolIssuance(): BelongsTo
    {
        return $this->belongsTo(ToolIssuance::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function isReturned(): bool
    {
        return $this->returned_at !== null;
    }
}

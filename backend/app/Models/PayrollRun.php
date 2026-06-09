<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_PENDING_FINANCE = 'pending_finance';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PROCESSED = 'processed';

    protected $fillable = [
        'period_year',
        'period_month',
        'status',
        'created_by',
        'submitted_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, PayrollRun>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, PayrollRun>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @return HasMany<PayrollEntry, PayrollRun>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(PayrollEntry::class);
    }
}

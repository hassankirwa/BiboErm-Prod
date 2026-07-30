<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENT = 'sent';

    public const STATUS_PARTIALLY_PAID = 'partially_paid';

    public const STATUS_PAID = 'paid';

    public const STATUS_OVERDUE = 'overdue';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'reference',
        'project_id',
        'contact_id',
        'type',
        'status',
        'amount',
        'amount_paid',
        'due_date',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'due_date' => 'date',
            'issued_at' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function scopeOverdue($query)
    {
        return $query
            ->where(function ($q) {
                $q->where('status', self::STATUS_OVERDUE)
                    ->orWhere(function ($inner) {
                        $inner->whereIn('status', [
                            self::STATUS_SENT,
                            self::STATUS_PARTIALLY_PAID,
                        ])
                            ->whereNotNull('due_date')
                            ->whereDate('due_date', '<', now()->toDateString())
                            ->whereColumn('amount_paid', '<', 'amount');
                    });
            });
    }
}

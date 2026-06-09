<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const TYPE_ANNUAL = 'annual';

    public const TYPE_SICK = 'sick';

    public const TYPE_UNPAID = 'unpaid';

    public const TYPE_COMPASSIONATE = 'compassionate';

    public const TYPE_OTHER = 'other';

    /**
     * @var list<string>
     */
    public const LEAVE_TYPES = [
        self::TYPE_ANNUAL,
        self::TYPE_SICK,
        self::TYPE_UNPAID,
        self::TYPE_COMPASSIONATE,
        self::TYPE_OTHER,
    ];

    protected $fillable = [
        'user_id',
        'leave_type',
        'start_date',
        'end_date',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, LeaveRequest>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, LeaveRequest>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

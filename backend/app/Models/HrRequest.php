<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HrRequest extends Model
{
    public const TYPE_SALARY_ADVANCE = 'salary_advance';

    public const TYPE_DOCUMENT = 'document';

    public const TYPE_LETTER = 'letter';

    public const TYPE_OTHER = 'other';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /**
     * @var list<string>
     */
    public const TYPES = [
        self::TYPE_SALARY_ADVANCE,
        self::TYPE_DOCUMENT,
        self::TYPE_LETTER,
        self::TYPE_OTHER,
    ];

    /**
     * @var list<string>
     */
    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    protected $fillable = [
        'user_id',
        'employee_number',
        'type',
        'amount',
        'notes',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, HrRequest>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, HrRequest>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

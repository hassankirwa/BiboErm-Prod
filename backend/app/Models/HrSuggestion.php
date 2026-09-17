<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HrSuggestion extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_REVIEWED = 'reviewed';

    public const STATUS_ARCHIVED = 'archived';

    /**
     * @var list<string>
     */
    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_REVIEWED,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'user_id',
        'employee_number',
        'is_anonymous',
        'body',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, HrSuggestion>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, HrSuggestion>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

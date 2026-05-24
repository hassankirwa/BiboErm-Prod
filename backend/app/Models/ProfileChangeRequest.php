<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileChangeRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /**
     * @var list<string>
     */
    public const PROFILE_FIELDS = [
        'phone',
        'gender',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
    ];

    /**
     * @var list<string>
     */
    public const IDENTITY_FIELDS = [
        'name',
        'email',
    ];

    /**
     * @var list<string>
     */
    public const REQUESTABLE_FIELDS = [
        ...self::PROFILE_FIELDS,
        ...self::IDENTITY_FIELDS,
    ];

    protected $fillable = [
        'user_id',
        'requested_changes',
        'previous_values',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'user_note',
    ];

    protected function casts(): array
    {
        return [
            'requested_changes' => 'array',
            'previous_values' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, ProfileChangeRequest>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, ProfileChangeRequest>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

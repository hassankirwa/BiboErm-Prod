<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginOtpCode extends Model
{
    protected $fillable = [
        'user_id',
        'challenge_token',
        'code_hash',
        'remember',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'remember' => 'boolean',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    /**
     * @return BelongsTo<User, LoginOtpCode>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

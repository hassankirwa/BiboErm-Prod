<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDevice extends Model
{
    protected $fillable = [
        'user_id',
        'device_id',
        'label',
        'platform',
        'ip_address',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, UserDevice>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

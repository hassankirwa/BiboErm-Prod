<?php

namespace App\Models;

use App\Support\BiboStorage;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    public const GENDER_MALE = 'male';

    public const GENDER_FEMALE = 'female';

    public const GENDER_OTHER = 'other';

    /**
     * @var list<string>
     */
    public const GENDERS = [
        self::GENDER_MALE,
        self::GENDER_FEMALE,
        self::GENDER_OTHER,
    ];

    protected $fillable = [
        'user_id',
        'phone',
        'phone_alt',
        'avatar_url',
        'avatar_path',
        'gender',
        'address',
        'home_county',
        'home_area',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'preferences',
    ];

    protected function casts(): array
    {
        return [
            'preferences' => 'array',
        ];
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(function (?string $value, array $attributes): ?string {
            $path = $attributes['avatar_path'] ?? null;

            if (is_string($path) && $path !== '') {
                $resolved = BiboStorage::resolvePublicUrl($path);

                if ($resolved !== null) {
                    return $resolved;
                }
            }

            return $value;
        });
    }

    /**
     * @return BelongsTo<User, UserProfile>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

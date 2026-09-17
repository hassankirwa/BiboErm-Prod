<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'default_module',
        'shared_email',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<UserDepartmentRole, Department>
     */
    public function userDepartmentRoles(): HasMany
    {
        return $this->hasMany(UserDepartmentRole::class);
    }
}

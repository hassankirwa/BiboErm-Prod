<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Role;

class UserDepartmentRole extends Model
{
    protected $fillable = [
        'user_id',
        'department_id',
        'role_id',
        'is_primary',
        'assigned_by',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, UserDepartmentRole>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Department, UserDepartmentRole>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<Role, UserDepartmentRole>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}

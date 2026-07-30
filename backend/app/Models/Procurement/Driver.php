<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\DriverStatus;
use App\Models\Projects\ProjectDispatch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use SoftDeletes;

    protected $table = 'procurement_drivers';

    protected $fillable = [
        'code',
        'name',
        'email',
        'phone',
        'license_number',
        'vehicle_registration',
        'vehicle_type',
        'notes',
        'is_active',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'status' => DriverStatus::class,
        ];
    }

    public function transportOrders(): HasMany
    {
        return $this->hasMany(TransportOrder::class);
    }

    public function projectDispatches(): HasMany
    {
        return $this->hasMany(ProjectDispatch::class);
    }
}

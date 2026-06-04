<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\DeliveryCondition;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FieldDeliveryRecord extends Model
{
    protected $fillable = [
        'job_id',
        'project_id',
        'transport_order_id',
        'received_by',
        'received_at',
        'delivery_condition',
        'vehicle_reg',
        'driver_name',
        'packing_list_ref',
        'expected_units',
        'received_units',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'delivery_condition' => DeliveryCondition::class,
            'received_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(FieldDeliveryLine::class, 'delivery_record_id');
    }
}

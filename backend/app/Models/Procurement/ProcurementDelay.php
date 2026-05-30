<?php

namespace App\Models\Procurement;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementDelay extends Model
{
    protected $fillable = [
        'project_id',
        'purchase_order_id',
        'glass_order_id',
        'reason',
        'expected_date',
        'actual_date',
        'days_delayed',
        'impact_notes',
        'logged_by',
    ];

    protected function casts(): array
    {
        return [
            'expected_date' => 'date',
            'actual_date' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function glassOrder(): BelongsTo
    {
        return $this->belongsTo(GlassOrder::class);
    }

    public function logger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}

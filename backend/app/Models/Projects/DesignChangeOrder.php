<?php

namespace App\Models\Projects;

use App\Enums\Projects\DesignChangeOrderStatus;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignChangeOrder extends Model
{
    protected $fillable = [
        'project_id',
        'field_non_conformity_id',
        'field_installation_unit_id',
        'status',
        'reason',
        'measurement_notes',
        'scope_bom_line_ids',
        'remeasure_site_visit_id',
        'revised_bom_version',
        'parent_production_order_id',
        'remake_production_order_id',
        'requested_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => DesignChangeOrderStatus::class,
            'measurement_notes' => 'array',
            'scope_bom_line_ids' => 'array',
            'revised_bom_version' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function nonConformity(): BelongsTo
    {
        return $this->belongsTo(FieldNonConformity::class, 'field_non_conformity_id');
    }

    public function fieldUnit(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationUnit::class, 'field_installation_unit_id');
    }

    public function remeasureSiteVisit(): BelongsTo
    {
        return $this->belongsTo(SiteVisit::class, 'remeasure_site_visit_id');
    }

    public function parentProductionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class, 'parent_production_order_id');
    }

    public function remakeProductionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class, 'remake_production_order_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

<?php

namespace App\Models\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\User;
use App\Models\Warehouse\Tool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class QcInspection extends Model
{
    protected $fillable = [
        'reference',
        'project_id',
        'project_document_id',
        'opening_code',
        'production_order_id',
        'goods_receipt_id',
        'field_installation_job_id',
        'warehouse_deck_slug',
        'warehouse_section_id',
        'tool_id',
        'stage',
        'context',
        'template_id',
        'result',
        'inspector_id',
        'completed_by',
        'checklist_responses',
        'custom_items',
        'notes',
        'internal_notes',
        'inspected_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => QcInspectionContext::class,
            'result' => QcInspectionResult::class,
            'checklist_responses' => 'array',
            'custom_items' => 'array',
            'inspected_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $inspection): void {
            // Keep an explicit production sub-stage (e.g. cutting) when set;
            // only default stage from context when empty.
            if (filled($inspection->stage)) {
                if (! $inspection->context && is_string($inspection->stage)) {
                    $inspection->context = QcInspectionContext::tryFrom($inspection->stage)
                        ?? $inspection->stage;
                }

                return;
            }

            if ($inspection->context instanceof QcInspectionContext) {
                $inspection->stage = $inspection->context->value;
            } elseif (is_string($inspection->context) && $inspection->context !== '') {
                $inspection->stage = $inspection->context;
            }
        });
    }

    public function isPending(): bool
    {
        return $this->result === QcInspectionResult::Pending;
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function projectDocument(): BelongsTo
    {
        return $this->belongsTo(ProjectDocument::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(QcChecklistTemplate::class, 'template_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function defects(): HasMany
    {
        return $this->hasMany(QcDefect::class, 'inspection_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(QcInspectionPhoto::class, 'inspection_id');
    }

    public static function goodsReceiptTableExists(): bool
    {
        return Schema::hasTable('goods_receipts');
    }
}

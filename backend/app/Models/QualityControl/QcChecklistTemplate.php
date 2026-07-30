<?php

namespace App\Models\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QcChecklistTemplate extends Model
{
    protected $fillable = [
        'name',
        'product_type',
        'stage',
        'context',
        'description',
        'items',
        'is_active',
        'is_system',
        'project_id',
        'parent_template_id',
        'created_by',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'context' => QcInspectionContext::class,
            'items' => 'array',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $template): void {
            // Allow production_in_process templates to keep a sub-stage
            // (cutting, fabrication, …). Only default when stage is empty.
            if (filled($template->stage)) {
                if (! $template->context && is_string($template->stage)) {
                    $template->context = QcInspectionContext::tryFrom($template->stage)
                        ?? $template->stage;
                }

                return;
            }

            if ($template->context instanceof QcInspectionContext) {
                $template->stage = $template->context->value;
            } elseif (is_string($template->context) && $template->context !== '') {
                $template->stage = $template->context;
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parentTemplate(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_template_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(QcInspection::class, 'template_id');
    }
}

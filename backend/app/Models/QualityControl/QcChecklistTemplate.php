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
            if ($template->context instanceof QcInspectionContext) {
                $template->stage = $template->context->value;
            } elseif (is_string($template->context) && $template->context !== '') {
                $template->stage = $template->context;
            } elseif ($template->stage && ! $template->context) {
                $template->context = $template->stage;
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

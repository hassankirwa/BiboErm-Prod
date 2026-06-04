<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QcChecklistTemplateService
{
    public function __construct(
        protected QcAuditLogger $audit,
    ) {}

    public function create(User $user, array $data): QcChecklistTemplate
    {
        $context = QcInspectionContext::from($data['context']);

        $template = QcChecklistTemplate::query()->create([
            'name' => $data['name'],
            'product_type' => $data['product_type'] ?? null,
            'context' => $context,
            'stage' => $context->value,
            'description' => $data['description'] ?? null,
            'items' => $data['items'],
            'is_active' => $data['is_active'] ?? true,
            'is_system' => false,
            'project_id' => $data['project_id'] ?? null,
            'parent_template_id' => $data['parent_template_id'] ?? null,
            'created_by' => $user->id,
            'version' => 1,
        ]);

        $this->audit->log('qc.template_created', $template);

        return $template;
    }

    public function update(QcChecklistTemplate $template, array $data): QcChecklistTemplate
    {
        if ($template->is_system) {
            throw ValidationException::withMessages([
                'template' => ['System templates cannot be edited. Clone to a project override first.'],
            ]);
        }

        $old = $template->only(['name', 'description', 'items', 'is_active', 'product_type']);

        $updates = array_filter([
            'name' => $data['name'] ?? null,
            'description' => array_key_exists('description', $data) ? $data['description'] : null,
            'items' => $data['items'] ?? null,
            'is_active' => $data['is_active'] ?? null,
            'product_type' => array_key_exists('product_type', $data) ? $data['product_type'] : null,
        ], fn ($value) => $value !== null);

        if ($updates !== []) {
            $template->update($updates);
        }

        $this->audit->log('qc.template_updated', $template->fresh(), $old, $template->fresh()->only(array_keys($old)));

        return $template->fresh();
    }

    public function cloneToProject(QcChecklistTemplate $source, User $user, int $projectId): QcChecklistTemplate
    {
        return DB::transaction(function () use ($source, $user, $projectId) {
            $clone = QcChecklistTemplate::query()->create([
                'name' => $source->name.' (Project override)',
                'product_type' => $source->product_type,
                'context' => $source->context,
                'stage' => $source->stage,
                'description' => $source->description,
                'items' => $source->items,
                'is_active' => true,
                'is_system' => false,
                'project_id' => $projectId,
                'parent_template_id' => $source->id,
                'created_by' => $user->id,
                'version' => ($source->version ?? 1) + 1,
            ]);

            $this->audit->log('qc.template_created', $clone, null, ['cloned_from' => $source->id]);

            return $clone;
        });
    }
}

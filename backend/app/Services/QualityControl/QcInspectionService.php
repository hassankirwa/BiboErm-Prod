<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcDefectSeverity;
use App\Enums\QualityControl\QcDefectStatus;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Events\QualityControl\QcInspectionCompleted;
use App\Events\QualityControl\QcInspectionFailed;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Production\ProductionOrder;
use App\Models\ProjectDocument;
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionPhoto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class QcInspectionService
{
    public function __construct(
        protected QcReferenceGenerator $refs,
        protected QcTemplateResolverService $templates,
        protected QcPhotoStorageService $photos,
        protected QcAuditLogger $audit,
        protected QcScheduleService $schedules,
        protected ProjectOpeningResolver $openings,
    ) {}

    public function start(User $user, array $data): QcInspection
    {
        $context = QcInspectionContext::from($data['context']);
        $projectId = $data['project_id'] ?? null;
        $stage = is_string($data['stage'] ?? null) && $data['stage'] !== ''
            ? $data['stage']
            : $context->value;

        $this->validateLinkedEntities($data, $context);

        $template = $this->templates->resolve($context, $projectId, $stage);

        $opening = $this->resolveOpeningFromPayload($data, $projectId);

        $inspection = QcInspection::query()->create([
            'reference' => $this->refs->inspection(),
            'project_id' => $projectId,
            'project_document_id' => $opening['project_document_id'] ?? null,
            'opening_code' => $opening['code'] ?? null,
            'production_order_id' => $data['production_order_id'] ?? null,
            'goods_receipt_id' => $data['goods_receipt_id'] ?? null,
            'field_installation_job_id' => $data['field_installation_job_id'] ?? null,
            'warehouse_deck_slug' => $data['warehouse_deck_slug'] ?? null,
            'warehouse_section_id' => $data['warehouse_section_id'] ?? null,
            'tool_id' => $data['tool_id'] ?? null,
            'context' => $context,
            'stage' => $stage,
            'template_id' => $template?->id,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $user->id,
            'checklist_responses' => [],
            'custom_items' => [],
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit->log('qc.inspection_started', $inspection);

        return $inspection->load(['template', 'inspector', 'projectDocument']);
    }

    public function saveDraft(QcInspection $inspection, User $user, array $data): QcInspection
    {
        $this->assertPending($inspection);
        $this->assertInspector($inspection, $user);

        $inspection = $this->ensureDefaultTemplate($inspection);

        $updates = [];

        if (array_key_exists('checklist_responses', $data)) {
            $updates['checklist_responses'] = $data['checklist_responses'];
        }

        if (array_key_exists('custom_items', $data)) {
            $updates['custom_items'] = $data['custom_items'];
        }

        if (array_key_exists('notes', $data)) {
            $updates['notes'] = $data['notes'];
        }

        if (array_key_exists('internal_notes', $data) && $user->can('qc.manage')) {
            $updates['internal_notes'] = $data['internal_notes'];
        }

        if ($updates !== []) {
            $inspection->update($updates);
        }

        return $inspection->fresh(['template', 'defects', 'photos']);
    }

    /**
     * Early production QC (pre-cutting / in-process) can be skipped —
     * formal inspection is expected after assembly (post-fabrication).
     */
    public function skip(QcInspection $inspection, User $user, ?string $notes = null): QcInspection
    {
        $this->assertPending($inspection);
        $this->assertInspector($inspection, $user);

        if (! $this->isSkippable($inspection)) {
            throw ValidationException::withMessages([
                'inspection' => [
                    'Only pre-cutting and in-process production inspections can be skipped. Complete post-assembly QC normally.',
                ],
            ]);
        }

        return DB::transaction(function () use ($inspection, $user, $notes) {
            $inspection->update([
                'result' => QcInspectionResult::Skipped,
                'notes' => $notes
                    ?? $inspection->notes
                    ?? 'Skipped — formal QC after assembly',
                'completed_by' => $user->id,
                'completed_at' => now(),
                'inspected_at' => now(),
            ]);

            $this->audit->log('qc.inspection_skipped', $inspection->fresh());

            return $inspection->fresh(['template', 'defects', 'photos', 'inspector', 'completedByUser']);
        });
    }

    public function isSkippable(QcInspection $inspection): bool
    {
        $context = $inspection->context instanceof QcInspectionContext
            ? $inspection->context
            : QcInspectionContext::tryFrom((string) $inspection->context);

        return in_array($context, [
            QcInspectionContext::ProductionQcPreCheck,
            QcInspectionContext::ProductionInProcess,
        ], true);
    }

    public function submit(QcInspection $inspection, User $user, array $data): QcInspection
    {
        $this->assertPending($inspection);
        $this->assertInspector($inspection, $user);

        $requestedResult = QcInspectionResult::from($data['result'] ?? QcInspectionResult::Pass->value);

        if ($requestedResult === QcInspectionResult::Skipped) {
            return $this->skip($inspection, $user, $data['notes'] ?? null);
        }

        $inspection = $this->ensureDefaultTemplate($inspection);

        if (array_key_exists('checklist_responses', $data)) {
            $inspection->checklist_responses = $data['checklist_responses'];
        }

        if (array_key_exists('custom_items', $data)) {
            $inspection->custom_items = $data['custom_items'];
        }

        if (array_key_exists('notes', $data)) {
            $inspection->notes = $data['notes'];
        }

        $this->validateChecklistResponses($inspection);
        $this->validatePhotoRequirements($inspection);

        $openCritical = $inspection->defects()
            ->where('severity', QcDefectSeverity::Critical)
            ->whereIn('status', [QcDefectStatus::Open, QcDefectStatus::InProgress])
            ->exists();

        if ($openCritical && in_array($requestedResult, [QcInspectionResult::Pass, QcInspectionResult::ConditionalPass], true)) {
            throw ValidationException::withMessages([
                'result' => ['Critical defects must be resolved or waived before passing.'],
            ]);
        }

        $finalResult = $requestedResult;
        if ($openCritical || $this->hasFailedChecklistItems($inspection)) {
            $finalResult = QcInspectionResult::Fail;
        }

        return DB::transaction(function () use ($inspection, $user, $finalResult) {
            $inspection->update([
                'result' => $finalResult,
                'completed_by' => $user->id,
                'completed_at' => now(),
                'inspected_at' => now(),
            ]);

            $this->audit->log('qc.inspection_submitted', $inspection->fresh());

            $contextValue = $inspection->context instanceof QcInspectionContext
                ? $inspection->context->value
                : (string) $inspection->context;

            if (in_array($finalResult, [QcInspectionResult::Pass, QcInspectionResult::ConditionalPass], true)) {
                QcInspectionCompleted::dispatch(
                    $inspection->id,
                    $contextValue,
                    $inspection->project_id,
                    $finalResult->value,
                    $user->id,
                );
            } else {
                QcInspectionFailed::dispatch(
                    $inspection->id,
                    $contextValue,
                    $inspection->project_id,
                    $user->id,
                );
            }

            return $inspection->fresh(['template', 'defects', 'photos', 'inspector', 'completedByUser']);
        });
    }

    public function uploadPhoto(
        QcInspection $inspection,
        User $user,
        UploadedFile $file,
        ?string $checklistKey = null,
        ?int $defectId = null,
        ?string $caption = null,
    ): QcInspectionPhoto {
        $this->assertPending($inspection);
        $this->assertInspector($inspection, $user);

        $stored = $this->photos->store($file, $inspection->id);

        return QcInspectionPhoto::query()->create([
            'inspection_id' => $inspection->id,
            'defect_id' => $defectId,
            'checklist_key' => $checklistKey,
            'file_path' => $stored['path'],
            'firebase_url' => $stored['url'],
            'caption' => $caption,
            'uploaded_by' => $user->id,
            'created_at' => now(),
        ]);
    }

    /**
     * Auto-create pending QC for a production stage (one per opening).
     * Soft for in-process stages; post-fab is also auto-created but remains the hard gate.
     *
     * Completing finishing creates both finishing in-process QC and post-fab QC.
     *
     * @return Collection<int, QcInspection>
     */
    public function createFromProductionStage(
        int $projectId,
        int $productionOrderId,
        string $productionStage,
    ): Collection {
        $targets = $this->mapProductionStageToQcTargets($productionStage);

        if ($targets === []) {
            return collect();
        }

        $created = collect();

        foreach ($targets as [$context, $stage]) {
            $created = $created->merge(
                $this->createForOpenings(
                    projectId: $projectId,
                    context: $context,
                    stage: $stage,
                    productionOrderId: $productionOrderId,
                )
            );
        }

        return $created->values();
    }

    /**
     * @return list<array{0: QcInspectionContext, 1: string}>
     */
    protected function mapProductionStageToQcTargets(string $productionStage): array
    {
        return match ($productionStage) {
            'cutting' => [
                [QcInspectionContext::ProductionInProcess, 'cutting'],
            ],
            'fabrication' => [
                [QcInspectionContext::ProductionInProcess, 'fabrication'],
            ],
            'sash' => [
                [QcInspectionContext::ProductionInProcess, 'sash'],
            ],
            'glass_assembly' => [
                [QcInspectionContext::ProductionInProcess, 'glass_assembly'],
            ],
            'finishing' => [
                [QcInspectionContext::ProductionInProcess, 'finishing'],
                [
                    QcInspectionContext::ProductionQcPostFabrication,
                    QcInspectionContext::ProductionQcPostFabrication->value,
                ],
            ],
            'qc_post_fabrication' => [
                [
                    QcInspectionContext::ProductionQcPostFabrication,
                    QcInspectionContext::ProductionQcPostFabrication->value,
                ],
            ],
            default => [],
        };
    }

    /**
     * @return Collection<int, QcInspection>
     */
    public function createSiteInstallation(int $projectId, int $fieldJobId): Collection
    {
        return $this->createForOpenings(
            projectId: $projectId,
            context: QcInspectionContext::SiteInstallation,
            stage: QcInspectionContext::SiteInstallation->value,
            fieldJobId: $fieldJobId,
        );
    }

    /**
     * @return Collection<int, QcInspection>
     */
    public function createSiteReceiving(
        int $projectId,
        int $fieldJobId,
        ?int $deliveryRecordId = null,
    ): Collection {
        $inspections = $this->createForOpenings(
            projectId: $projectId,
            context: QcInspectionContext::SiteReceiving,
            stage: QcInspectionContext::SiteReceiving->value,
            fieldJobId: $fieldJobId,
            notes: $deliveryRecordId !== null
                ? "field_delivery_record_id:{$deliveryRecordId}"
                : null,
        );

        if ($deliveryRecordId !== null) {
            $tag = "field_delivery_record_id:{$deliveryRecordId}";
            foreach ($inspections as $inspection) {
                $notes = (string) ($inspection->notes ?? '');
                if (! str_contains($notes, $tag)) {
                    $inspection->update([
                        'notes' => trim($notes === '' ? $tag : "{$notes}; {$tag}"),
                    ]);
                }
            }
        }

        return $inspections->map(fn (QcInspection $i) => $this->ensureDefaultTemplate($i->fresh()));
    }

    /**
     * Pre-install QC when project reaches qc_pre_installation (one per opening).
     *
     * @return Collection<int, QcInspection>
     */
    public function createSitePreInstallation(int $projectId, ?int $fieldJobId = null): Collection
    {
        return $this->createForOpenings(
            projectId: $projectId,
            context: QcInspectionContext::SitePreInstallation,
            stage: QcInspectionContext::SitePreInstallation->value,
            fieldJobId: $fieldJobId,
        );
    }

    /**
     * Whether every opening (or the single job-level inspection) has passed post-fab QC.
     */
    public function hasPassedPostFabricationQc(int $projectId, int $productionOrderId): bool
    {
        return $this->allOpeningsPassed(
            projectId: $projectId,
            context: QcInspectionContext::ProductionQcPostFabrication,
            stage: QcInspectionContext::ProductionQcPostFabrication->value,
            productionOrderId: $productionOrderId,
        );
    }

    /**
     * Whether every opening (or the single job-level inspection) has passed site installation QC.
     */
    public function hasPassedSiteInstallationQc(int $projectId): bool
    {
        return $this->allOpeningsPassed(
            projectId: $projectId,
            context: QcInspectionContext::SiteInstallation,
            stage: QcInspectionContext::SiteInstallation->value,
        );
    }

    /**
     * Fan-out pending inspections for each project opening (or one opening-less row).
     *
     * @return Collection<int, QcInspection>
     */
    protected function createForOpenings(
        int $projectId,
        QcInspectionContext $context,
        string $stage,
        ?int $productionOrderId = null,
        ?int $fieldJobId = null,
        ?string $notes = null,
    ): Collection {
        $openings = $this->openings->resolve($projectId);
        if ($openings->isEmpty()) {
            $openings = collect([['code' => null, 'project_document_id' => null]]);
        }

        $template = $this->templates->resolve($context, $projectId, $stage);
        $created = collect();

        foreach ($openings as $opening) {
            $code = $opening['code'] ?? null;
            $documentId = $opening['project_document_id'] ?? null;

            $query = QcInspection::query()
                ->where('context', $context)
                ->where('stage', $stage);

            if ($productionOrderId !== null) {
                $query->where('production_order_id', $productionOrderId);
            }

            if ($fieldJobId !== null) {
                $query->where('field_installation_job_id', $fieldJobId);
            } elseif ($productionOrderId === null) {
                $query->where('project_id', $projectId)
                    ->whereNull('field_installation_job_id');
            }

            if ($code === null) {
                $query->whereNull('opening_code');
            } else {
                $query->where('opening_code', $code);
            }

            $existing = $query
                ->orderByRaw(
                    'CASE WHEN result = ? THEN 0 ELSE 1 END',
                    [QcInspectionResult::Pending->value],
                )
                ->orderByDesc('id')
                ->first();

            if ($existing) {
                $created->push($this->ensureDefaultTemplate($existing));

                continue;
            }

            $created->push(QcInspection::query()->create([
                'reference' => $this->refs->inspection(),
                'project_id' => $projectId,
                'project_document_id' => $documentId,
                'opening_code' => $code,
                'production_order_id' => $productionOrderId,
                'field_installation_job_id' => $fieldJobId,
                'context' => $context,
                'stage' => $stage,
                'template_id' => $template?->id,
                'result' => QcInspectionResult::Pending,
                'checklist_responses' => [],
                'custom_items' => [],
                'notes' => $notes,
            ]));
        }

        return $created->values();
    }

    protected function allOpeningsPassed(
        int $projectId,
        QcInspectionContext $context,
        string $stage,
        ?int $productionOrderId = null,
    ): bool {
        $openings = $this->openings->resolve($projectId);

        $base = QcInspection::query()
            ->where('context', $context)
            ->where('stage', $stage)
            ->whereIn('result', [
                QcInspectionResult::Pass,
                QcInspectionResult::ConditionalPass,
            ]);

        if ($productionOrderId !== null) {
            $base->where('production_order_id', $productionOrderId);
        } else {
            $base->where('project_id', $projectId);
        }

        if ($openings->isEmpty()) {
            return (clone $base)->whereNull('opening_code')->exists()
                || (clone $base)->exists();
        }

        foreach ($openings as $opening) {
            $code = $opening['code'];
            $passed = (clone $base)->where('opening_code', $code)->exists();
            if (! $passed) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{code: string|null, project_document_id: int|null}
     */
    protected function resolveOpeningFromPayload(array $data, ?int $projectId): array
    {
        $documentId = isset($data['project_document_id']) ? (int) $data['project_document_id'] : null;
        $code = isset($data['opening_code']) && is_string($data['opening_code'])
            ? strtoupper(trim($data['opening_code']))
            : null;
        $code = $code !== '' ? $code : null;

        if ($documentId !== null) {
            $doc = ProjectDocument::query()->find($documentId);
            if (! $doc) {
                throw ValidationException::withMessages([
                    'project_document_id' => ['The selected opening document does not exist.'],
                ]);
            }

            if ($projectId !== null && (int) $doc->project_id !== $projectId) {
                throw ValidationException::withMessages([
                    'project_document_id' => ['Opening document does not belong to this project.'],
                ]);
            }

            $docCode = is_string($doc->metadata['code'] ?? null)
                ? strtoupper(trim((string) $doc->metadata['code']))
                : null;

            return [
                'code' => $code ?? ($docCode !== '' ? $docCode : null),
                'project_document_id' => $doc->id,
            ];
        }

        return [
            'code' => $code,
            'project_document_id' => null,
        ];
    }

    public function ensureReceivingInspection(int $goodsReceiptId, ?int $projectId = null): QcInspection
    {
        $existing = QcInspection::query()
            ->where('goods_receipt_id', $goodsReceiptId)
            ->where('context', QcInspectionContext::WarehouseReceiving)
            ->where('result', QcInspectionResult::Pending)
            ->first();

        if ($existing) {
            return $this->ensureDefaultTemplate($existing);
        }

        return $this->createReceivingInspection($goodsReceiptId, $projectId);
    }

    public function createReceivingInspection(int $goodsReceiptId, ?int $projectId = null): QcInspection
    {
        $context = QcInspectionContext::WarehouseReceiving;
        $template = $this->templates->resolve($context, $projectId);

        return QcInspection::query()->create([
            'reference' => $this->refs->inspection(),
            'project_id' => $projectId,
            'goods_receipt_id' => $goodsReceiptId,
            'context' => $context,
            'stage' => $context->value,
            'template_id' => $template?->id,
            'result' => QcInspectionResult::Pending,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);
    }

    protected function validateLinkedEntities(array $data, QcInspectionContext $context): void
    {
        if (! empty($data['goods_receipt_id'])) {
            if (! Schema::hasTable('goods_receipts')) {
                throw ValidationException::withMessages([
                    'goods_receipt_id' => ['Goods receipts are not available yet.'],
                ]);
            }

            if (! GoodsReceipt::query()->whereKey($data['goods_receipt_id'])->exists()) {
                throw ValidationException::withMessages([
                    'goods_receipt_id' => ['The selected goods receipt does not exist.'],
                ]);
            }
        }

        if (! empty($data['production_order_id'])) {
            if (! ProductionOrder::query()->whereKey($data['production_order_id'])->exists()) {
                throw ValidationException::withMessages([
                    'production_order_id' => ['The selected production order does not exist.'],
                ]);
            }
        }

        if ($context === QcInspectionContext::WarehouseReceiving && empty($data['goods_receipt_id'])) {
            throw ValidationException::withMessages([
                'goods_receipt_id' => ['A goods receipt is required for warehouse receiving inspections.'],
            ]);
        }
    }

    /**
     * Attach the active system (or project override) template when an inspection has none.
     */
    public function ensureDefaultTemplate(QcInspection $inspection): QcInspection
    {
        if ($inspection->template_id) {
            return $inspection->relationLoaded('template')
                ? $inspection
                : $inspection->load('template');
        }

        $context = $inspection->context instanceof QcInspectionContext
            ? $inspection->context
            : QcInspectionContext::from((string) $inspection->context);

        $template = $this->templates->resolve(
            $context,
            $inspection->project_id,
            is_string($inspection->stage) ? $inspection->stage : null,
        );

        if ($template) {
            $inspection->update(['template_id' => $template->id]);

            return $inspection->fresh(['template']);
        }

        return $inspection;
    }

    protected function assertPending(QcInspection $inspection): void
    {
        if (! $inspection->isPending()) {
            throw ValidationException::withMessages([
                'inspection' => ['This inspection has already been submitted.'],
            ]);
        }
    }

    protected function assertInspector(QcInspection $inspection, User $user): void
    {
        if ($inspection->inspector_id && (int) $inspection->inspector_id !== (int) $user->id && ! $user->can('qc.manage')) {
            throw ValidationException::withMessages([
                'inspection' => ['You are not assigned to this inspection.'],
            ]);
        }
    }

    protected function validateChecklistResponses(QcInspection $inspection): void
    {
        $items = $this->templates->checklistItemsForInspection($inspection);
        $responses = $inspection->checklist_responses ?? [];

        foreach ($items as $item) {
            if (! ($item['required'] ?? false)) {
                continue;
            }

            $key = $item['key'] ?? null;
            if (! $key || ! array_key_exists($key, $responses)) {
                throw ValidationException::withMessages([
                    'checklist_responses' => ["Required checklist item \"{$key}\" is missing a response."],
                ]);
            }
        }
    }

    protected function validatePhotoRequirements(QcInspection $inspection): void
    {
        $items = $this->templates->checklistItemsForInspection($inspection);
        $responses = $inspection->checklist_responses ?? [];

        foreach ($items as $item) {
            $type = $item['type'] ?? 'pass_fail';
            if ($type !== 'photo_required_on_fail') {
                continue;
            }

            $key = $item['key'] ?? null;
            if (! $key) {
                continue;
            }

            $response = $responses[$key]['value'] ?? $responses[$key] ?? null;
            if (! in_array($response, ['fail', false, 'no'], true)) {
                continue;
            }

            $hasPhoto = $inspection->photos()->where('checklist_key', $key)->exists();
            if (! $hasPhoto) {
                throw ValidationException::withMessages([
                    'photos' => ["A photo is required for failed item \"{$key}\"."],
                ]);
            }
        }
    }

    protected function hasFailedChecklistItems(QcInspection $inspection): bool
    {
        $responses = $inspection->checklist_responses ?? [];

        foreach ($responses as $response) {
            $value = is_array($response) ? ($response['value'] ?? null) : $response;
            if (in_array($value, ['fail', false, 'no'], true)) {
                return true;
            }
        }

        return false;
    }
}

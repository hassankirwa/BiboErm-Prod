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
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionPhoto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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
    ) {}

    public function start(User $user, array $data): QcInspection
    {
        $context = QcInspectionContext::from($data['context']);
        $projectId = $data['project_id'] ?? null;

        $this->validateLinkedEntities($data, $context);

        $template = $this->templates->resolve($context, $projectId);

        $inspection = QcInspection::query()->create([
            'reference' => $this->refs->inspection(),
            'project_id' => $projectId,
            'production_order_id' => $data['production_order_id'] ?? null,
            'goods_receipt_id' => $data['goods_receipt_id'] ?? null,
            'field_installation_job_id' => $data['field_installation_job_id'] ?? null,
            'warehouse_deck_slug' => $data['warehouse_deck_slug'] ?? null,
            'warehouse_section_id' => $data['warehouse_section_id'] ?? null,
            'tool_id' => $data['tool_id'] ?? null,
            'context' => $context,
            'stage' => $context->value,
            'template_id' => $template?->id,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $user->id,
            'checklist_responses' => [],
            'custom_items' => [],
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit->log('qc.inspection_started', $inspection);

        return $inspection->load(['template', 'inspector']);
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

    public function submit(QcInspection $inspection, User $user, array $data): QcInspection
    {
        $this->assertPending($inspection);
        $this->assertInspector($inspection, $user);

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

        $requestedResult = QcInspectionResult::from($data['result'] ?? QcInspectionResult::Pass->value);

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

    public function createFromProductionStage(
        int $projectId,
        int $productionOrderId,
        string $productionStage,
    ): ?QcInspection {
        $context = match ($productionStage) {
            'qc_pre_check' => QcInspectionContext::ProductionQcPreCheck,
            'qc_post_fabrication' => QcInspectionContext::ProductionQcPostFabrication,
            default => null,
        };

        if (! $context instanceof QcInspectionContext) {
            return null;
        }

        $existing = QcInspection::query()
            ->where('production_order_id', $productionOrderId)
            ->where('context', $context)
            ->where('result', QcInspectionResult::Pending)
            ->first();

        if ($existing) {
            return $existing;
        }

        $template = $this->templates->resolve($context, $projectId);

        return QcInspection::query()->create([
            'reference' => $this->refs->inspection(),
            'project_id' => $projectId,
            'production_order_id' => $productionOrderId,
            'context' => $context,
            'stage' => $context->value,
            'template_id' => $template?->id,
            'result' => QcInspectionResult::Pending,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);
    }

    public function createSiteInstallation(int $projectId, int $fieldJobId): QcInspection
    {
        $context = QcInspectionContext::SiteInstallation;
        $template = $this->templates->resolve($context, $projectId);

        return QcInspection::query()->create([
            'reference' => $this->refs->inspection(),
            'project_id' => $projectId,
            'field_installation_job_id' => $fieldJobId,
            'context' => $context,
            'stage' => $context->value,
            'template_id' => $template?->id,
            'result' => QcInspectionResult::Pending,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);
    }

    public function ensureReceivingInspection(int $goodsReceiptId, ?int $projectId = null): QcInspection
    {
        $existing = QcInspection::query()
            ->where('goods_receipt_id', $goodsReceiptId)
            ->where('context', QcInspectionContext::WarehouseReceiving)
            ->where('result', QcInspectionResult::Pending)
            ->first();

        if ($existing) {
            return $existing;
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

    protected function ensureDefaultTemplate(QcInspection $inspection): QcInspection
    {
        if ($inspection->template_id) {
            return $inspection;
        }

        $context = $inspection->context instanceof QcInspectionContext
            ? $inspection->context
            : QcInspectionContext::from((string) $inspection->context);

        $template = $this->templates->resolve($context, $inspection->project_id);

        if ($template) {
            $inspection->update(['template_id' => $template->id]);

            return $inspection->fresh();
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

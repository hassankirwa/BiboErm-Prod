<?php

namespace App\Services\Warehouse\Tools;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\Warehouse\ToolCondition;
use App\Events\Warehouse\ToolReplacementRequired;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Warehouse\WarehouseAuditLogger;
use InvalidArgumentException;

class ToolIssuanceService
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    public function issue(
        Tool $tool,
        User $issuedTo,
        User $issuedBy,
        ?int $projectId = null,
        ?string $conditionOut = null,
        int $quantity = 1,
    ): ToolIssuance {
        if ($quantity < 1) {
            throw new InvalidArgumentException('Quantity must be at least 1.');
        }

        if ($tool->isSerialized()) {
            $quantity = 1;
            if ($tool->activeIssuance()) {
                throw new InvalidArgumentException('Tool is already issued.');
            }
        } elseif ($quantity > $tool->availableQty()) {
            throw new InvalidArgumentException(
                "Insufficient available quantity. Available: {$tool->availableQty()}."
            );
        }

        $issuance = ToolIssuance::query()->create([
            'tool_id' => $tool->id,
            'project_id' => $projectId,
            'issued_to' => $issuedTo->id,
            'issued_by' => $issuedBy->id,
            'quantity' => $quantity,
            'issue_date' => now()->toDateString(),
            'condition_out' => $conditionOut ?? ($tool->condition?->value ?? ToolCondition::Good->value),
            'created_at' => now(),
        ])->load('tool', 'issuedToUser', 'issuedByUser', 'project');

        if ($projectId) {
            $this->linkIssuanceToActiveFieldJob($issuance, $issuedBy);
        }

        $this->audit->toolIssued($issuance->id, [
            'tool_id' => $tool->id,
            'tool_code' => $tool->tool_code,
            'issued_to' => $issuedTo->id,
            'project_id' => $projectId,
            'quantity' => $quantity,
        ]);

        return $issuance;
    }

    /**
     * When warehouse issues a tool to a project that already has an active field job,
     * create a FieldToolAssignment so the job can start and track returns.
     * Uses model create directly to avoid circular DI with FieldToolAssignmentService.
     */
    protected function linkIssuanceToActiveFieldJob(ToolIssuance $issuance, User $issuedBy): void
    {
        if (FieldToolAssignment::query()->where('tool_issuance_id', $issuance->id)->exists()) {
            return;
        }

        $job = FieldInstallationJob::query()
            ->where('project_id', $issuance->project_id)
            ->whereIn('status', [
                FieldJobStatus::Scheduled->value,
                FieldJobStatus::InProgress->value,
                FieldJobStatus::OnHold->value,
            ])
            ->latest('id')
            ->first();

        if (! $job) {
            return;
        }

        FieldToolAssignment::query()->create([
            'job_id' => $job->id,
            'tool_issuance_id' => $issuance->id,
            'assigned_by' => $issuedBy->id,
            'created_at' => now(),
        ]);
    }

    public function returnTool(
        ToolIssuance $issuance,
        ?string $conditionIn = null,
        ?string $damageNotes = null,
    ): ToolIssuance {
        if ($issuance->return_date) {
            throw new InvalidArgumentException('Tool has already been returned.');
        }

        $issuance->return_date = now()->toDateString();
        $issuance->condition_in = $conditionIn;
        $issuance->damage_notes = $damageNotes;
        $issuance->save();

        FieldToolAssignment::query()
            ->where('tool_issuance_id', $issuance->id)
            ->whereNull('returned_at')
            ->update(['returned_at' => now()]);

        if ($conditionIn) {
            $tool = $issuance->tool;
            if ($tool->isSerialized()) {
                $mapped = match ($conditionIn) {
                    ToolCondition::Lost->value => ToolCondition::Lost,
                    default => ToolCondition::tryFrom($conditionIn) ?? $tool->condition,
                };
                $tool->condition = $mapped;
                $tool->save();
            }
        }

        $updated = $issuance->fresh(['tool', 'issuedToUser', 'issuedByUser', 'project', 'fieldToolAssignment']);

        if (in_array($conditionIn, [
            ToolCondition::Damaged->value,
            ToolCondition::Retired->value,
            ToolCondition::Lost->value,
        ], true)) {
            $tool = $updated->tool;

            event(new ToolReplacementRequired(
                toolId: $tool->id,
                toolCode: $tool->tool_code,
                issuanceId: $updated->id,
                conditionIn: $conditionIn,
                damageNotes: $damageNotes,
            ));

            $this->audit->toolReplacementRequired($tool->id, [
                'issuance_id' => $updated->id,
                'condition_in' => $conditionIn,
                'damage_notes' => $damageNotes,
                'quantity' => $updated->quantity,
            ]);
        }

        return $updated;
    }
}

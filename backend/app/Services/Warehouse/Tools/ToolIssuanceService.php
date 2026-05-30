<?php

namespace App\Services\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Events\Warehouse\ToolReplacementRequired;
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
    ): ToolIssuance {
        if ($tool->activeIssuance()) {
            throw new InvalidArgumentException('Tool is already issued.');
        }

        $issuance = ToolIssuance::query()->create([
            'tool_id' => $tool->id,
            'project_id' => $projectId,
            'issued_to' => $issuedTo->id,
            'issued_by' => $issuedBy->id,
            'issue_date' => now()->toDateString(),
            'condition_out' => $conditionOut ?? ($tool->condition?->value ?? ToolCondition::Good->value),
            'created_at' => now(),
        ])->load('tool', 'issuedToUser', 'issuedByUser', 'project');

        $this->audit->toolIssued($issuance->id, [
            'tool_id' => $tool->id,
            'tool_code' => $tool->tool_code,
            'issued_to' => $issuedTo->id,
            'project_id' => $projectId,
        ]);

        return $issuance;
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

        if ($conditionIn) {
            $tool = $issuance->tool;
            $tool->condition = ToolCondition::tryFrom($conditionIn) ?? $tool->condition;
            $tool->save();
        }

        $updated = $issuance->fresh(['tool', 'issuedToUser', 'issuedByUser', 'project']);

        if (in_array($conditionIn, [ToolCondition::Damaged->value, ToolCondition::Retired->value], true)) {
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
            ]);
        }

        return $updated;
    }
}

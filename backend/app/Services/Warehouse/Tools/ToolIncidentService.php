<?php

namespace App\Services\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolIncidentStatus;
use App\Enums\Warehouse\ToolIncidentType;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIncident;
use App\Models\Warehouse\ToolIssuance;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ToolIncidentService
{
    /**
     * @param  array{
     *     tool_id?: int,
     *     tool?: Tool,
     *     issuance_id?: int|null,
     *     field_job_id?: int|null,
     *     responsible_user_id: int,
     *     type: string|ToolIncidentType,
     *     notes?: string|null,
     *     quantity?: int,
     * }  $data
     */
    public function report(User $reportedBy, array $data): ToolIncident
    {
        return DB::transaction(function () use ($reportedBy, $data) {
            $tool = $data['tool'] ?? Tool::query()->findOrFail($data['tool_id']);
            $type = $data['type'] instanceof ToolIncidentType
                ? $data['type']
                : ToolIncidentType::from((string) $data['type']);
            $quantity = max(1, (int) ($data['quantity'] ?? 1));

            $incident = ToolIncident::query()->create([
                'tool_id' => $tool->id,
                'issuance_id' => $data['issuance_id'] ?? null,
                'field_job_id' => $data['field_job_id'] ?? null,
                'responsible_user_id' => $data['responsible_user_id'],
                'reported_by' => $reportedBy->id,
                'type' => $type,
                'status' => ToolIncidentStatus::Open,
                'notes' => $data['notes'] ?? null,
                'quantity' => $quantity,
            ]);

            $this->applyReportSideEffects($tool, $type, $quantity);

            return $incident->fresh([
                'tool',
                'issuance',
                'responsibleUser',
                'reportedByUser',
                'replacementTool',
            ]);
        });
    }

    public function startRepair(ToolIncident $incident): ToolIncident
    {
        if ($incident->status !== ToolIncidentStatus::Open) {
            throw new InvalidArgumentException('Only open incidents can start repair.');
        }

        $incident->status = ToolIncidentStatus::InRepair;
        $incident->save();

        return $incident->fresh([
            'tool',
            'issuance',
            'responsibleUser',
            'reportedByUser',
            'replacementTool',
        ]);
    }

    /**
     * @param  array{
     *     status: string|ToolIncidentStatus,
     *     resolution_notes?: string|null,
     *     replacement_tool_id?: int|null,
     *     create_replacement?: bool,
     *     replacement?: array{tool_code?: string, name?: string, tool_type?: string|null},
     * }  $data
     */
    public function resolve(ToolIncident $incident, array $data): ToolIncident
    {
        return DB::transaction(function () use ($incident, $data) {
            if ($incident->status->isTerminal()) {
                throw new InvalidArgumentException('Incident is already resolved.');
            }

            $status = $data['status'] instanceof ToolIncidentStatus
                ? $data['status']
                : ToolIncidentStatus::from((string) $data['status']);

            if (! in_array($status, [
                ToolIncidentStatus::Repaired,
                ToolIncidentStatus::Replaced,
                ToolIncidentStatus::WrittenOff,
            ], true)) {
                throw new InvalidArgumentException('Invalid resolution status.');
            }

            $tool = $incident->tool;
            $quantity = max(1, (int) $incident->quantity);

            if (in_array($incident->status, [ToolIncidentStatus::Open, ToolIncidentStatus::InRepair], true)
                && $this->affectsRepairQty($incident->type)
            ) {
                $this->decrementRepairQty($tool, $quantity);
            }

            if ($status === ToolIncidentStatus::Repaired) {
                if ($tool->isSerialized() && $tool->condition === ToolCondition::Damaged) {
                    $tool->condition = ToolCondition::Good;
                    $tool->save();
                }
            }

            if ($status === ToolIncidentStatus::Replaced) {
                $replacementId = $data['replacement_tool_id'] ?? null;

                if (! $replacementId && ! empty($data['create_replacement'])) {
                    $replacement = $this->createReplacementTool($tool, $data['replacement'] ?? []);
                    $replacementId = $replacement->id;
                }

                if ($tool->isQuantityTracked() && $this->affectsRepairQty($incident->type)) {
                    $tool->total_qty = max(0, (int) $tool->total_qty - $quantity);
                    $tool->save();
                }

                if ($tool->isSerialized()) {
                    $tool->condition = ToolCondition::Retired;
                    $tool->is_active = false;
                    $tool->save();
                }

                $incident->replacement_tool_id = $replacementId;
            }

            if ($status === ToolIncidentStatus::WrittenOff) {
                if ($tool->isQuantityTracked() && $this->affectsRepairQty($incident->type)) {
                    $tool->total_qty = max(0, (int) $tool->total_qty - $quantity);
                    $tool->save();
                } elseif ($tool->isSerialized()) {
                    $tool->condition = ToolCondition::Retired;
                    $tool->is_active = false;
                    $tool->save();
                }
            }

            $incident->status = $status;
            $incident->resolution_notes = $data['resolution_notes'] ?? $incident->resolution_notes;
            $incident->save();

            return $incident->fresh([
                'tool',
                'issuance',
                'responsibleUser',
                'reportedByUser',
                'replacementTool',
            ]);
        });
    }

    public function reportFromIssuance(
        ToolIssuance $issuance,
        string $conditionIn,
        ?string $damageNotes,
        ?User $reportedBy = null,
    ): ToolIncident {
        $issuance->loadMissing('tool', 'issuedToUser', 'issuedByUser');

        $type = in_array($conditionIn, [ToolCondition::Retired->value, ToolCondition::Lost->value], true)
            ? ToolIncidentType::Loss
            : ToolIncidentType::Damage;

        $reporter = $reportedBy ?? $issuance->issuedByUser ?? $issuance->issuedToUser;

        $fieldJobId = $issuance->fieldToolAssignment?->job_id;

        return $this->report($reporter, [
            'tool' => $issuance->tool,
            'issuance_id' => $issuance->id,
            'field_job_id' => $fieldJobId,
            'responsible_user_id' => $issuance->issued_to,
            'type' => $type,
            'notes' => $damageNotes,
            'quantity' => max(1, (int) $issuance->quantity),
        ]);
    }

    private function applyReportSideEffects(Tool $tool, ToolIncidentType $type, int $quantity): void
    {
        if ($tool->isQuantityTracked()) {
            if ($this->affectsRepairQty($type)) {
                $tool->qty_in_repair = (int) $tool->qty_in_repair + $quantity;
                $tool->save();
            } elseif ($type === ToolIncidentType::Loss) {
                $tool->total_qty = max(0, (int) $tool->total_qty - $quantity);
                $tool->save();
            }

            return;
        }

        if ($type === ToolIncidentType::Loss) {
            $tool->condition = ToolCondition::Lost;
        } else {
            $tool->condition = ToolCondition::Damaged;
        }
        $tool->save();
    }

    private function affectsRepairQty(ToolIncidentType $type): bool
    {
        return in_array($type, [ToolIncidentType::Damage, ToolIncidentType::Malfunction], true);
    }

    private function decrementRepairQty(Tool $tool, int $quantity): void
    {
        if (! $tool->isQuantityTracked()) {
            return;
        }

        $tool->qty_in_repair = max(0, (int) $tool->qty_in_repair - $quantity);
        $tool->save();
    }

    /** @param  array{tool_code?: string, name?: string, tool_type?: string|null}  $attrs */
    private function createReplacementTool(Tool $damaged, array $attrs): Tool
    {
        $code = $attrs['tool_code'] ?? ($damaged->tool_code.'-R'.now()->format('ymdHis'));

        return Tool::query()->create([
            'tool_code' => $code,
            'name' => $attrs['name'] ?? ($damaged->name.' (replacement)'),
            'tool_type' => $attrs['tool_type'] ?? $damaged->tool_type,
            'condition' => ToolCondition::Good,
            'is_active' => true,
            'tracking_mode' => $damaged->tracking_mode,
            'total_qty' => $damaged->isQuantityTracked() ? max(1, (int) ($attrs['total_qty'] ?? 1)) : 1,
            'qty_in_repair' => 0,
        ]);
    }
}

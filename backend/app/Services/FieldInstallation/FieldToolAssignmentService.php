<?php

namespace App\Services\FieldInstallation;

use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Warehouse\Tools\ToolIssuanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldToolAssignmentService
{
    public function __construct(
        protected ToolIssuanceService $toolIssuance,
        protected FieldInstallationAuditLogger $audit,
    ) {}

    public function issue(
        FieldInstallationJob $job,
        Tool $tool,
        User $issuedTo,
        User $issuedBy,
        array $data = [],
    ): FieldToolAssignment {
        return DB::transaction(function () use ($job, $tool, $issuedTo, $issuedBy, $data) {
            $issuance = $this->toolIssuance->issue(
                tool: $tool,
                issuedTo: $issuedTo,
                issuedBy: $issuedBy,
                projectId: $job->project_id,
                conditionOut: $data['condition_out'] ?? null,
            );

            $assignment = FieldToolAssignment::query()->create([
                'job_id' => $job->id,
                'tool_issuance_id' => $issuance->id,
                'assigned_by' => $issuedBy->id,
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
            ]);

            $this->audit->log('field.tool_linked', $assignment, newValues: [
                'tool_issuance_id' => $issuance->id,
                'job_id' => $job->id,
            ]);

            return $assignment->fresh(['toolIssuance.tool', 'assignedByUser']);
        });
    }

    public function returnAssignment(
        FieldToolAssignment $assignment,
        User $actor,
        array $data = [],
    ): FieldToolAssignment {
        if ($assignment->returned_at) {
            throw ValidationException::withMessages([
                'assignment' => ['Tool assignment has already been returned.'],
            ]);
        }

        return DB::transaction(function () use ($assignment, $data) {
            $issuance = $assignment->toolIssuance;
            $this->toolIssuance->returnTool(
                issuance: $issuance,
                conditionIn: $data['condition_in'] ?? null,
                damageNotes: $data['damage_notes'] ?? null,
            );

            $assignment->update(['returned_at' => now()]);

            return $assignment->fresh(['toolIssuance.tool', 'assignedByUser']);
        });
    }
}

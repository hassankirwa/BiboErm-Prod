<?php

namespace App\Services\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Enums\FieldInstallation\NonConformityStatus;
use App\Enums\FieldInstallation\NonConformityType;
use App\Events\FieldInstallation\FieldNonConformityReported;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldNonConformityService
{
    public function __construct(
        protected FieldInstallationAuditLogger $audit,
    ) {}

    public function report(FieldInstallationJob $job, User $actor, array $data): FieldNonConformity
    {
        return DB::transaction(function () use ($job, $actor, $data) {
            $severity = NonConformitySeverity::from($data['severity']);

            $nc = FieldNonConformity::query()->create([
                'job_id' => $job->id,
                'field_installation_unit_id' => $data['field_installation_unit_id'] ?? null,
                'project_id' => $job->project_id,
                'delivery_record_id' => $data['delivery_record_id'] ?? null,
                'daily_log_id' => $data['daily_log_id'] ?? null,
                'nc_type' => NonConformityType::from($data['nc_type']),
                'severity' => $severity,
                'status' => NonConformityStatus::Open,
                'title' => $data['title'],
                'description' => $data['description'],
                'project_bom_line_id' => $data['project_bom_line_id'] ?? null,
                'warehouse_item_id' => $data['warehouse_item_id'] ?? null,
                'qty_affected' => $data['qty_affected'] ?? null,
                'reported_by' => $actor->id,
                'reported_at' => now(),
            ]);

            if ($severity === NonConformitySeverity::Critical) {
                $job->update(['status' => FieldJobStatus::OnHold]);
            }

            event(new FieldNonConformityReported(
                jobId: $job->id,
                projectId: $job->project_id,
                nonConformityId: $nc->id,
                severity: $severity->value,
                reportedByUserId: $actor->id,
            ));

            $this->audit->log('field.non_conformity_reported', $nc, newValues: [
                'severity' => $severity->value,
                'nc_type' => $nc->nc_type->value,
            ]);

            return $nc->fresh('reporter');
        });
    }

    public function updateStatus(FieldNonConformity $nc, User $actor, array $data): FieldNonConformity
    {
        $status = NonConformityStatus::from($data['status']);
        $updates = ['status' => $status];

        if ($status === NonConformityStatus::Acknowledged) {
            $updates['acknowledged_by'] = $actor->id;
            $updates['acknowledged_at'] = now();
        }

        if ($status === NonConformityStatus::Resolved) {
            $updates['resolved_by'] = $actor->id;
            $updates['resolved_at'] = now();
            $updates['resolution_notes'] = $data['resolution_notes'] ?? null;
        }

        if ($status === NonConformityStatus::Waived && ! $actor->can('field_installation.manage')) {
            throw ValidationException::withMessages([
                'status' => ['Waiving non-conformities requires manage permission.'],
            ]);
        }

        $nc->update($updates);

        return $nc->fresh();
    }
}

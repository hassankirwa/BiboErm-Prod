<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcDefectSeverity;
use App\Enums\QualityControl\QcDefectStatus;
use App\Enums\QualityControl\QcInspectionResult;
use App\Models\QualityControl\QcDefect;
use App\Models\QualityControl\QcInspection;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QcDefectService
{
    public function __construct(
        protected QcAuditLogger $audit,
    ) {}

    public function create(QcInspection $inspection, User $user, array $data): QcDefect
    {
        if (! $inspection->isPending()) {
            throw ValidationException::withMessages([
                'inspection' => ['Defects can only be added to pending inspections.'],
            ]);
        }

        $defect = QcDefect::query()->create([
            'inspection_id' => $inspection->id,
            'checklist_key' => $data['checklist_key'] ?? null,
            'severity' => QcDefectSeverity::from($data['severity']),
            'description' => $data['description'],
            'status' => QcDefectStatus::Open,
            'reported_by' => $user->id,
        ]);

        $this->audit->log('qc.defect_reported', $defect);

        return $defect;
    }

    public function resolve(QcDefect $defect, User $user, array $data): QcDefect
    {
        $severity = $defect->severity;
        $status = $data['status'] ?? QcDefectStatus::Resolved->value;

        if ($status === QcDefectStatus::Waived->value && $severity === QcDefectSeverity::Critical) {
            if (! $user->can('qc.waive_critical')) {
                throw ValidationException::withMessages([
                    'status' => ['Critical defects require qc.waive_critical permission to waive.'],
                ]);
            }
        }

        $old = $defect->only(['status', 'resolution_notes', 'resolved_at']);

        $defect->update([
            'status' => QcDefectStatus::from($status),
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'resolved_at' => in_array($status, [QcDefectStatus::Resolved->value, QcDefectStatus::Waived->value], true)
                ? now()
                : null,
        ]);

        $this->audit->log('qc.defect_resolved', $defect->fresh(), $old, $defect->fresh()->only(array_keys($old)));

        return $defect->fresh();
    }
}

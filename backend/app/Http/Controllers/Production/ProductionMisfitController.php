<?php

namespace App\Http\Controllers\Production;

use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Enums\FieldInstallation\NonConformityStatus;
use App\Enums\FieldInstallation\NonConformityType;
use App\Enums\Projects\DesignChangeOrderStatus;
use App\Http\Controllers\Controller;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\Projects\DesignChangeOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionMisfitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('production.view')
                || $request->user()?->can('production.manage')
                || $request->user()?->can('*'),
            403,
        );

        $units = FieldInstallationUnit::query()
            ->where('status', FieldUnitStatus::Snagged->value)
            ->with([
                'job.project',
            ])
            ->latest('updated_at')
            ->get();

        $projectIds = $units->pluck('job.project_id')->filter()->unique()->values();
        $jobIds = $units->pluck('job_id')->filter()->unique()->values();

        $ncs = FieldNonConformity::query()
            ->whereIn('job_id', $jobIds)
            ->whereIn('nc_type', [
                NonConformityType::DimensionMismatch->value,
                NonConformityType::WrongMeasurement->value,
            ])
            ->whereIn('status', [
                NonConformityStatus::Open->value,
                NonConformityStatus::Acknowledged->value,
            ])
            ->latest('reported_at')
            ->get()
            ->groupBy('job_id');

        $dcos = DesignChangeOrder::query()
            ->whereIn('project_id', $projectIds)
            ->whereNotIn('status', [
                DesignChangeOrderStatus::Closed->value,
                DesignChangeOrderStatus::Cancelled->value,
            ])
            ->with(['remakeProductionOrder', 'nonConformity'])
            ->latest('id')
            ->get()
            ->groupBy('project_id');

        $rows = $units->map(function (FieldInstallationUnit $unit) use ($ncs, $dcos) {
            $job = $unit->job;
            $project = $job?->project;
            $jobNcs = $ncs->get($unit->job_id, collect());
            $matchedNc = $jobNcs->first(function (FieldNonConformity $nc) use ($unit) {
                $hay = mb_strtolower(($nc->title ?? '').' '.($nc->description ?? ''));
                $needle = mb_strtolower($unit->unit_label ?? '');

                return $needle !== '' && str_contains($hay, $needle);
            }) ?? $jobNcs->first();

            $projectDcos = $dcos->get($project?->id, collect());
            $matchedDco = $matchedNc
                ? $projectDcos->firstWhere('field_non_conformity_id', $matchedNc->id)
                : null;
            $matchedDco ??= $projectDcos->first();

            return [
                'unit_id' => $unit->id,
                'unit_label' => $unit->unit_label,
                'opening_ref' => $unit->opening_ref,
                'product_type' => $unit->product_type,
                'unit_floor' => $unit->unit_floor,
                'misfit_notes' => $unit->misfit_notes ?? $unit->snag_notes,
                'status' => $unit->status?->value ?? $unit->status,
                'updated_at' => $unit->updated_at?->toIso8601String(),
                'job' => $job ? [
                    'id' => $job->id,
                    'reference' => $job->reference,
                    'status' => $job->status?->value ?? $job->status,
                ] : null,
                'project' => $project ? [
                    'id' => $project->id,
                    'reference' => $project->reference,
                    'name' => $project->name,
                    'stage' => $project->stage?->value ?? $project->stage,
                ] : null,
                'non_conformity' => $matchedNc ? [
                    'id' => $matchedNc->id,
                    'nc_type' => $matchedNc->nc_type?->value ?? $matchedNc->nc_type,
                    'severity' => $matchedNc->severity?->value ?? $matchedNc->severity,
                    'status' => $matchedNc->status?->value ?? $matchedNc->status,
                    'title' => $matchedNc->title,
                    'description' => $matchedNc->description,
                    'reported_at' => $matchedNc->reported_at?->toIso8601String(),
                ] : null,
                'design_change_order' => $matchedDco ? [
                    'id' => $matchedDco->id,
                    'status' => $matchedDco->status?->value ?? $matchedDco->status,
                    'reason' => $matchedDco->reason,
                    'remake_production_order_id' => $matchedDco->remake_production_order_id,
                    'remake_production_order' => $matchedDco->remakeProductionOrder ? [
                        'id' => $matchedDco->remakeProductionOrder->id,
                        'reference' => $matchedDco->remakeProductionOrder->reference,
                        'status' => $matchedDco->remakeProductionOrder->status?->value
                            ?? $matchedDco->remakeProductionOrder->status,
                    ] : null,
                ] : null,
            ];
        })->values();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'total' => $rows->count(),
            ],
        ]);
    }
}

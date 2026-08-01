<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolIncidentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\ReturnToolRequest;
use App\Http\Resources\Warehouse\ToolIncidentResource;
use App\Models\Warehouse\ToolIncident;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Warehouse\Tools\ToolIncidentService;
use App\Services\Warehouse\Tools\ToolIssuanceService;
use Illuminate\Http\JsonResponse;

class ReturnToolController extends Controller
{
    public function __construct(
        protected ToolIssuanceService $toolIssuance,
        protected ToolIncidentService $incidents,
    ) {}

    public function __invoke(ReturnToolRequest $request, ToolIssuance $issuance): JsonResponse
    {
        $data = $request->validated();
        $disposition = $data['disposition'] ?? null;

        $conditionIn = $data['condition_in'] ?? match ($disposition) {
            'damaged', 'replaced' => ToolCondition::Damaged->value,
            'lost' => ToolCondition::Lost->value,
            'returned' => ToolCondition::Good->value,
            default => $data['condition_in'] ?? ToolCondition::Good->value,
        };

        $notes = $data['damage_notes'] ?? null;
        if (in_array($disposition, ['damaged', 'lost', 'replaced'], true) && blank($notes)) {
            $notes = match ($disposition) {
                'lost' => 'Marked lost on return.',
                'replaced' => 'Marked for replacement on return.',
                default => 'Damage logged on return.',
            };
        }

        $updated = $this->toolIssuance->returnTool(
            issuance: $issuance,
            conditionIn: $conditionIn,
            damageNotes: $notes,
        );

        $incident = null;
        $wantsReplacement = ($disposition === 'replaced')
            || $request->boolean('create_replacement');

        if ($wantsReplacement || in_array($conditionIn, [
            ToolCondition::Damaged->value,
            ToolCondition::Lost->value,
            ToolCondition::Retired->value,
        ], true)) {
            $incident = ToolIncident::query()
                ->where('issuance_id', $updated->id)
                ->whereIn('status', [
                    ToolIncidentStatus::Open->value,
                    ToolIncidentStatus::InRepair->value,
                ])
                ->latest('id')
                ->first();

            if (! $incident) {
                $incident = $this->incidents->reportFromIssuance(
                    issuance: $updated->fresh(['tool', 'issuedToUser', 'issuedByUser', 'fieldToolAssignment']),
                    conditionIn: $conditionIn,
                    damageNotes: $notes,
                    reportedBy: $request->user(),
                );
            }

            if ($wantsReplacement) {
                $incident = $this->incidents->resolve($incident, [
                    'status' => ToolIncidentStatus::Replaced,
                    'resolution_notes' => $notes ?? 'Replacement registered on return.',
                    'create_replacement' => true,
                    'replacement' => $data['replacement'] ?? [],
                ]);
            } else {
                $incident = $incident->fresh([
                    'tool',
                    'issuance',
                    'responsibleUser',
                    'reportedByUser',
                    'replacementTool',
                ]);
            }
        }

        return response()->json([
            'id' => $updated->id,
            'tool_id' => $updated->tool_id,
            'return_date' => $updated->return_date?->toDateString(),
            'condition_in' => $updated->condition_in,
            'damage_notes' => $updated->damage_notes,
            'disposition' => $disposition,
            'incident' => $incident ? (new ToolIncidentResource($incident))->resolve() : null,
        ]);
    }
}

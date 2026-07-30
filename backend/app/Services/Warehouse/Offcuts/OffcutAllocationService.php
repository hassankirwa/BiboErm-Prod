<?php

namespace App\Services\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\Warehouse\OffcutPiece;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class OffcutAllocationService
{
    /**
     * @return Collection<int, OffcutPiece>
     */
    public function searchUsable(int $itemId, int $minLengthMm): Collection
    {
        if ($minLengthMm <= 0) {
            return collect();
        }

        return OffcutPiece::query()
            ->where('item_id', $itemId)
            ->where('status', OffcutStatus::Available)
            ->where('length_mm', '>=', $minLengthMm)
            ->orderBy('length_mm')
            ->orderBy('logged_at')
            ->get();
    }

    public function totalUsableMetres(int $itemId, int $requiredLengthMm): string
    {
        $pieces = $this->searchUsable($itemId, $requiredLengthMm);

        $totalMm = $pieces->sum(fn (OffcutPiece $piece) => $piece->length_mm * $piece->quantity_pieces);

        return bcdiv((string) $totalMm, '1000', 3);
    }

    /**
     * Allocate offcut pieces to a project until required metres are covered.
     *
     * @return array{metres_allocated: string, piece_ids: list<int>}
     */
    public function allocateMetresForProject(
        int $projectId,
        int $itemId,
        int $requiredLengthMm,
        string $requiredMetres,
    ): array {
        if ($requiredLengthMm <= 0 || bccomp($requiredMetres, '0', 3) !== 1) {
            return ['metres_allocated' => '0.000', 'piece_ids' => []];
        }

        $remaining = $requiredMetres;
        $allocatedIds = [];

        foreach ($this->searchUsable($itemId, $requiredLengthMm) as $offcut) {
            if (bccomp($remaining, '0', 3) !== 1) {
                break;
            }

            $pieceMetres = bcdiv((string) ($offcut->length_mm * $offcut->quantity_pieces), '1000', 3);
            $this->allocate($offcut, $projectId);
            $allocatedIds[] = $offcut->id;
            $remaining = bcsub($remaining, $pieceMetres, 3);
        }

        $metresAllocated = bcsub($requiredMetres, max($remaining, '0'), 3);

        return [
            'metres_allocated' => bccomp($metresAllocated, '0', 3) === 1 ? $metresAllocated : '0.000',
            'piece_ids' => $allocatedIds,
        ];
    }

    /**
     * Allocate specific offcut pieces to a project (marks Allocated).
     *
     * @param  list<int>  $offcutIds
     * @return list<int>
     */
    public function allocatePieceIds(int $projectId, array $offcutIds): array
    {
        $allocated = [];
        foreach (array_values(array_unique(array_filter(array_map('intval', $offcutIds)))) as $id) {
            $offcut = OffcutPiece::query()->find($id);
            if (! $offcut || $offcut->status !== \App\Enums\Warehouse\OffcutStatus::Available) {
                continue;
            }
            $this->allocate($offcut, $projectId);
            $allocated[] = $id;
        }

        return $allocated;
    }

    public function allocate(OffcutPiece $offcut, int $projectId): OffcutPiece
    {
        if ($offcut->status !== OffcutStatus::Available) {
            throw new InvalidArgumentException('Offcut is not available for allocation.');
        }

        $offcut->status = OffcutStatus::Allocated;
        $offcut->allocated_project_id = $projectId;
        $offcut->save();

        return $offcut->fresh(['item', 'bin', 'allocatedProject']);
    }

    public function markConsumed(OffcutPiece $offcut): OffcutPiece
    {
        $offcut->status = OffcutStatus::Consumed;
        $offcut->save();

        return $offcut;
    }
}

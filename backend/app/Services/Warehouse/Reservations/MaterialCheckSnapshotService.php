<?php

namespace App\Services\Warehouse\Reservations;

use App\Models\Project;

class MaterialCheckSnapshotService
{
    /**
     * Persist the latest stock-check result onto project.stage_data.material_check
     * so overview UIs do not keep showing a stale shortage snapshot.
     *
     * @param  array{can_fully_reserve?: bool, lines?: list<array<string, mixed>>}  $check
     */
    public function store(Project $project, array $check): void
    {
        $existing = is_array($project->stage_data) ? $project->stage_data : [];
        $lines = collect($check['lines'] ?? []);

        $project->forceFill([
            'stage_data' => array_merge($existing, [
                'material_check' => [
                    'checked_at' => now()->toIso8601String(),
                    'can_fully_reserve' => (bool) ($check['can_fully_reserve'] ?? false),
                    'line_count' => $lines->count(),
                    'shortage_lines' => $lines
                        ->filter(fn (array $line) => bccomp((string) ($line['shortage'] ?? '0'), '0', 3) === 1)
                        ->count(),
                    'lines' => $lines
                        ->map(fn (array $line) => [
                            'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                            'item_id' => $line['item_id'] ?? null,
                            'sku' => $line['sku'] ?? null,
                            'name' => $line['name'] ?? null,
                            'category' => $line['category'] ?? null,
                            'required' => (string) ($line['required'] ?? '0'),
                            'effective_available' => (string) ($line['effective_available'] ?? '0'),
                            'shortage' => (string) ($line['shortage'] ?? '0'),
                        ])
                        ->values()
                        ->all(),
                ],
            ]),
        ])->save();
    }
}

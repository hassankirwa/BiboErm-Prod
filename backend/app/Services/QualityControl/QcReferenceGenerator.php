<?php

namespace App\Services\QualityControl;

use Illuminate\Support\Facades\DB;

class QcReferenceGenerator
{
    public function inspection(): string
    {
        return $this->next('QC', 'qc_inspections', 'reference');
    }

    private function next(string $prefix, string $table, string $column): string
    {
        $year = now()->format('Y');
        $fullPrefix = "{$prefix}-{$year}-";

        $latest = DB::table($table)
            ->where($column, 'like', $fullPrefix.'%')
            ->orderByDesc($column)
            ->value($column);

        $sequence = 1;
        if (is_string($latest) && preg_match('/-(\d+)$/', $latest, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }

        return $fullPrefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}

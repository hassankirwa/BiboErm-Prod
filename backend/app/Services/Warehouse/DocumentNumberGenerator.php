<?php

namespace App\Services\Warehouse;

use Illuminate\Support\Facades\DB;

class DocumentNumberGenerator
{
    public function next(string $prefix, string $table, string $column): string
    {
        $year = now()->format('Y');
        $pattern = "{$prefix}-{$year}-%";

        $last = DB::table($table)
            ->where($column, 'like', $pattern)
            ->orderByDesc($column)
            ->value($column);

        $sequence = 1;

        if (is_string($last) && preg_match('/-(\d+)$/', $last, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s-%s-%05d', $prefix, $year, $sequence);
    }
}

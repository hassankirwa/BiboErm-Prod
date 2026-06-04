<?php

namespace App\Services\Production;

use Illuminate\Support\Facades\DB;

class ProductionReferenceGenerator
{
    public function next(): string
    {
        $year = now()->format('Y');
        $pattern = "PROD-{$year}-%";

        $last = DB::table('production_orders')
            ->where('reference', 'like', $pattern)
            ->orderByDesc('reference')
            ->value('reference');

        $sequence = 1;

        if (is_string($last) && preg_match('/-(\d+)$/', $last, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('PROD-%s-%05d', $year, $sequence);
    }
}

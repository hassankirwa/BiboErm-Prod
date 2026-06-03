<?php

namespace App\Services\FieldInstallation;

use Illuminate\Support\Facades\DB;

class FieldInstallationReferenceGenerator
{
    public function next(): string
    {
        $prefix = config('bibo.field_installation.reference_prefix', 'FI');
        $year = now()->format('Y');
        $fullPrefix = "{$prefix}-{$year}-";

        $latest = DB::table('field_installation_jobs')
            ->where('reference', 'like', $fullPrefix.'%')
            ->orderByDesc('reference')
            ->value('reference');

        $sequence = 1;
        if (is_string($latest) && preg_match('/-(\d+)$/', $latest, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }

        return $fullPrefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}

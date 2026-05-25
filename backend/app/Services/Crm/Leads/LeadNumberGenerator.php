<?php

namespace App\Services\Crm\Leads;

use App\Models\Lead;

class LeadNumberGenerator
{
    public function generate(): string
    {
        $year = now()->format('Y');
        $prefix = "LD-{$year}-";

        $latest = Lead::query()
            ->where('lead_number', 'like', "{$prefix}%")
            ->orderByDesc('lead_number')
            ->value('lead_number');

        $sequence = 1;

        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}

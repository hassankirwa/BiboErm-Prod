<?php

namespace App\Support;

use App\Models\Lead;
use App\Models\Project;
use App\Models\SiteVisit;

final class ProjectSiteLocation
{
    /**
     * @return array{site_address: ?string, latitude: ?string, longitude: ?string}
     */
    public static function resolve(Project $project): array
    {
        $project->loadMissing(['account.sourceLead', 'deal']);

        foreach (self::addressCandidates($project) as $candidate) {
            $trimmed = trim((string) ($candidate ?? ''));
            if ($trimmed !== '') {
                return [
                    'site_address' => $trimmed,
                    'latitude' => null,
                    'longitude' => null,
                ];
            }
        }

        return [
            'site_address' => null,
            'latitude' => null,
            'longitude' => null,
        ];
    }

    /**
     * @return list<string|null>
     */
    protected static function addressCandidates(Project $project): array
    {
        return [
            $project->site_address,
            $project->deal?->site_address,
            $project->account?->physical_address,
            $project->account?->billing_address,
            $project->account?->sourceLead?->site_address,
            self::addressFromLeadSiteFields($project->account?->sourceLead),
            self::addressFromLatestQuotationVisit($project->account_id),
        ];
    }

    protected static function addressFromLeadSiteFields(?Lead $lead): ?string
    {
        if (! $lead) {
            return null;
        }

        $parts = array_values(array_filter([
            $lead->site_address,
            $lead->area_estate,
            $lead->subcounty,
            $lead->ward,
        ], fn ($part) => trim((string) ($part ?? '')) !== ''));

        if ($parts === []) {
            return null;
        }

        return implode(', ', array_map(fn ($part) => trim((string) $part), $parts));
    }

    protected static function addressFromLatestQuotationVisit(?int $accountId): ?string
    {
        if (! $accountId) {
            return null;
        }

        $visit = SiteVisit::query()
            ->where('account_id', $accountId)
            ->where('measurement_context', 'quotation')
            ->where('status', 'approved')
            ->latest('id')
            ->first();

        if (! $visit) {
            return null;
        }

        if (trim((string) ($visit->site_address ?? '')) !== '') {
            return $visit->site_address;
        }

        $form = $visit->measurement_form_data;
        if (is_array($form) && trim((string) ($form['project_address'] ?? '')) !== '') {
            return (string) $form['project_address'];
        }

        return null;
    }
}

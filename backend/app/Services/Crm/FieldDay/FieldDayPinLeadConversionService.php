<?php

namespace App\Services\Crm\FieldDay;

use App\Enums\Crm\LeadStatus;
use App\Models\FieldDayPin;
use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\Leads\LeadContactService;
use App\Services\Crm\Leads\LeadNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldDayPinLeadConversionService
{
    public function __construct(
        protected LeadNumberGenerator $leadNumberGenerator,
        protected LeadContactService $leadContactService,
    ) {}

    public function convert(FieldDayPin $pin, User $user): Lead
    {
        if ($pin->lead_id) {
            throw ValidationException::withMessages([
                'pin' => ['This pin has already been converted to a lead.'],
            ]);
        }

        $pin->loadMissing(['fieldDay', 'county']);
        $fieldDay = $pin->fieldDay;

        $leadSourceId = DB::table('crm_lead_sources')
            ->where('slug', 'field_visit')
            ->value('id');

        $leadNumber = $this->leadNumberGenerator->generate();
        $name = $pin->site_label
            ?: ($pin->notes ? mb_substr(trim($pin->notes), 0, 80) : "Field visit #{$pin->id}");

        $lead = Lead::query()->create([
            'name' => $name,
            'first_name' => $name,
            'last_name' => null,
            'company' => null,
            'lead_source_id' => $leadSourceId,
            'status' => LeadStatus::New->value,
            'lead_owner_id' => $fieldDay->field_officer_id,
            'assigned_field_officer_id' => $fieldDay->field_officer_id,
            'assigned_to' => $fieldDay->field_officer_id,
            'site_name' => $pin->site_label,
            'site_address' => $this->composeSiteAddress($pin),
            'requirement_description' => $pin->findings,
            'latitude' => $pin->latitude,
            'longitude' => $pin->longitude,
            'county_id' => $pin->county_id,
            'subcounty' => $pin->subcounty,
            'ward' => $pin->ward,
            'source' => 'field_visit',
            'reference' => $leadNumber,
            'lead_number' => $leadNumber,
            'product_interests' => ['custom'],
            'need_site_visit' => false,
            'created_by' => $user->id,
        ]);

        $pin->update(['lead_id' => $lead->id]);

        $this->leadContactService->createFromLead($lead, $user);

        return $lead->fresh(['leadOwner', 'assignedFieldOfficer']);
    }

    protected function composeSiteAddress(FieldDayPin $pin): ?string
    {
        $locationAddress = trim((string) $pin->location_address);
        if ($locationAddress !== '' && ! $this->isAdminOnlyLocationAddress($locationAddress, $pin)) {
            return $locationAddress;
        }

        $adminParts = array_filter([
            $pin->ward,
            $pin->subcounty,
            $pin->county?->label,
        ]);

        if ($adminParts !== []) {
            return implode(', ', $adminParts);
        }

        return $pin->notes ? trim($pin->notes) : null;
    }

    protected function isAdminOnlyLocationAddress(string $address, FieldDayPin $pin): bool
    {
        if (preg_match('/\b(?:division|sublocation)\b/i', $address)
            && ! preg_match('/\b(?:road|street|avenue|drive|lane|plot|building|estate)\b/i', $address)) {
            return true;
        }

        $adminParts = array_filter([
            $pin->ward,
            $pin->subcounty,
            $pin->county?->label,
        ]);

        if ($adminParts === []) {
            return false;
        }

        $normalizedAddress = strtolower(preg_replace('/\s+/', ' ', $address));
        $normalizedAdmin = strtolower(implode(', ', $adminParts));

        return $normalizedAddress === $normalizedAdmin
            || str_contains($normalizedAddress, ' division,');
    }
}

<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LeadConversionService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function convert(Lead $lead, User $user, array $data): array
    {
        $allowed = [
            LeadStatus::Qualified->value,
            LeadStatus::SiteVisitScheduled->value,
            LeadStatus::MeasurementsCaptured->value,
        ];

        $status = $lead->status instanceof LeadStatus ? $lead->status->value : $lead->status;

        if (! in_array($status, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['Lead cannot be converted in its current status.'],
            ]);
        }

        return DB::transaction(function () use ($lead, $user, $data, $status) {
            $account = null;
            $contact = null;
            $deal = null;

            if ($data['create_account'] ?? true) {
                $account = Account::query()->create([
                    'account_number' => 'AC-'.strtoupper(Str::random(8)),
                    'name' => $lead->account_name ?? $lead->name,
                    'account_type' => $lead->account_type,
                    'industry' => $lead->industry,
                    'phone' => $lead->company_phone ?? $lead->phone,
                    'email' => $lead->company_email ?? $lead->email,
                    'website' => $lead->website,
                    'kra_pin' => $lead->kra_pin,
                    'billing_address' => $lead->billing_address,
                    'county_id' => $lead->county_id,
                    'status' => 'prospect',
                    'account_owner_id' => $lead->lead_owner_id ?? $user->id,
                    'source_lead_id' => $lead->id,
                    'created_by' => $user->id,
                ]);
            }

            if ($data['create_contact'] ?? true) {
                $contact = Contact::query()
                    ->where('source_lead_id', $lead->id)
                    ->first();

                if ($contact) {
                    if ($account && ! $contact->account_id) {
                        $contact->update(['account_id' => $account->id]);
                    }
                } else {
                    $contact = Contact::query()->create([
                        'contact_number' => 'CT-'.strtoupper(Str::random(8)),
                        'name' => $lead->contact_person_name ?? $lead->name,
                        'first_name' => $lead->first_name ?? explode(' ', $lead->name ?? '')[0] ?? 'Contact',
                        'last_name' => $lead->last_name,
                        'phone' => $lead->phone,
                        'whatsapp' => $lead->whatsapp,
                        'email' => $lead->email,
                        'job_title' => $lead->job_title,
                        'preferred_contact_method' => $lead->preferred_contact_method,
                        'status' => 'new_contact',
                        'account_id' => $account?->id,
                        'contact_owner_id' => $lead->lead_owner_id ?? $user->id,
                        'source_lead_id' => $lead->id,
                        'created_by' => $user->id,
                    ]);
                }

                if ($account) {
                    $account->update(['primary_contact_id' => $contact->id]);
                }
            }

            if ($data['create_deal'] ?? true) {
                $stage = $status === LeadStatus::MeasurementsCaptured->value
                    ? DealStage::QuotationPreparation->value
                    : DealStage::NewDeal->value;

                $deal = Deal::query()->create([
                    'reference' => 'DL-'.strtoupper(Str::random(8)),
                    'deal_number' => 'DL-'.strtoupper(Str::random(8)),
                    'title' => $data['deal_name'] ?? ($lead->name.' Deal'),
                    'name' => $data['deal_name'] ?? ($lead->name.' Deal'),
                    'account_id' => $account?->id ?? $lead->converted_account_id,
                    'contact_id' => $contact?->id,
                    'primary_contact_id' => $contact?->id,
                    'lead_id' => $lead->id,
                    'source_lead_id' => $lead->id,
                    'stage' => $stage,
                    'status' => 'open',
                    'amount' => $data['estimated_value'] ?? $lead->estimated_budget ?? $lead->estimated_value,
                    'estimated_value' => $data['estimated_value'] ?? $lead->estimated_budget ?? $lead->estimated_value,
                    'expected_close_date' => $data['expected_close_date'] ?? null,
                    'product_interests' => $lead->product_interests,
                    'requirement_summary' => $lead->requirement_description,
                    'site_address' => $lead->site_address,
                    'latitude' => $lead->latitude,
                    'longitude' => $lead->longitude,
                    'owner_id' => $lead->lead_owner_id ?? $user->id,
                    'deal_owner_id' => $lead->lead_owner_id ?? $user->id,
                    'assigned_field_officer_id' => $lead->assigned_field_officer_id,
                    'created_by' => $user->id,
                ]);
            }

            $lead->update([
                'status' => LeadStatus::Converted->value,
                'converted_at' => now(),
                'converted_contact_id' => $contact?->id ?? $lead->converted_contact_id,
                'converted_account_id' => $account?->id ?? $lead->converted_account_id,
                'converted_deal_id' => $deal?->id,
                'updated_by' => $user->id,
            ]);

            if ($deal) {
                SiteVisit::query()
                    ->where('lead_id', $lead->id)
                    ->whereNull('deal_id')
                    ->update([
                        'deal_id' => $deal->id,
                        'account_id' => $account?->id ?? $deal->account_id,
                        'contact_id' => $contact?->id ?? $deal->primary_contact_id,
                    ]);
            }

            $lead = $lead->fresh();

            $this->crmAudit->leadConverted($lead, [
                'contact_id' => $contact?->id,
                'account_id' => $account?->id,
                'deal_id' => $deal?->id,
            ], $user);

            return [
                'lead' => $lead->fresh(),
                'account' => $account,
                'contact' => $contact,
                'deal' => $deal?->load(['contact', 'account', 'owner']),
            ];
        });
    }
}

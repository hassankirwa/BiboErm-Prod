<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Account;
use App\Models\AccountDocument;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadPhoto;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountProvisioningService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function provisionFromLead(Lead $lead, User $user): array
    {
        if ($lead->converted_account_id) {
            return [
                'lead' => $lead->fresh(),
                'account' => Account::query()->find($lead->converted_account_id),
                'contact' => Contact::query()->find($lead->converted_contact_id),
            ];
        }

        $existingAccount = Account::query()->where('source_lead_id', $lead->id)->first();

        if ($existingAccount) {
            return $this->linkLeadToExistingAccount($lead, $existingAccount, $user);
        }

        if (! $this->isEligibleForProvisioning($lead)) {
            throw ValidationException::withMessages([
                'status' => ['Lead must be marked interested before provisioning an account.'],
            ]);
        }

        return DB::transaction(function () use ($lead, $user) {
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
                'building_construction_stage_id' => $lead->building_construction_stage_id,
                'status' => 'prospect',
                'account_owner_id' => $lead->lead_owner_id ?? $user->id,
                'source_lead_id' => $lead->id,
                'created_by' => $user->id,
            ]);

            $contact = Contact::query()
                ->where('source_lead_id', $lead->id)
                ->first();

            if ($contact) {
                if (! $contact->account_id) {
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
                    'account_id' => $account->id,
                    'contact_owner_id' => $lead->lead_owner_id ?? $user->id,
                    'source_lead_id' => $lead->id,
                    'created_by' => $user->id,
                ]);
            }

            $account->update(['primary_contact_id' => $contact->id]);

            SiteVisit::query()
                ->where('lead_id', $lead->id)
                ->whereNull('account_id')
                ->update([
                    'account_id' => $account->id,
                    'contact_id' => $contact->id,
                ]);

            $lead->update([
                'status' => LeadStatus::AccountCreated->value,
                'converted_at' => now(),
                'converted_contact_id' => $contact->id,
                'converted_account_id' => $account->id,
                'updated_by' => $user->id,
            ]);

            $this->copyLeadPhotosToAccountDocuments($lead, $account, $user);

            $this->crmAudit->leadAccountProvisioned($lead, [
                'account_id' => $account->id,
                'contact_id' => $contact->id,
            ], $user);

            return [
                'lead' => $lead->fresh(),
                'account' => $account->fresh(),
                'contact' => $contact->fresh(),
            ];
        });
    }

    /**
     * Link a lead to an account that already exists (e.g. manual account create with source_lead_id).
     *
     * @return array{lead: Lead, account: Account, contact: Contact|null}
     */
    public function linkLeadToExistingAccount(Lead $lead, Account $account, User $user): array
    {
        if ($lead->converted_account_id) {
            return [
                'lead' => $lead->fresh(),
                'account' => $account->fresh(),
                'contact' => Contact::query()->find($lead->converted_contact_id),
            ];
        }

        return DB::transaction(function () use ($lead, $account, $user) {
            $contact = Contact::query()->where('source_lead_id', $lead->id)->first();

            if ($contact && ! $contact->account_id) {
                $contact->update(['account_id' => $account->id]);
            }

            if (! $contact && $account->primary_contact_id) {
                $contact = Contact::query()->find($account->primary_contact_id);
            }

            if (! $account->primary_contact_id && $contact) {
                $account->update(['primary_contact_id' => $contact->id]);
            }

            SiteVisit::query()
                ->where('lead_id', $lead->id)
                ->whereNull('account_id')
                ->update([
                    'account_id' => $account->id,
                    'contact_id' => $contact?->id,
                ]);

            $lead->update([
                'status' => LeadStatus::AccountCreated->value,
                'converted_at' => $lead->converted_at ?? now(),
                'converted_contact_id' => $contact?->id,
                'converted_account_id' => $account->id,
                'updated_by' => $user->id,
            ]);

            $this->copyLeadPhotosToAccountDocuments($lead, $account, $user);

            $this->crmAudit->leadAccountProvisioned($lead, [
                'account_id' => $account->id,
                'contact_id' => $contact?->id,
            ], $user);

            return [
                'lead' => $lead->fresh(),
                'account' => $account->fresh(),
                'contact' => $contact?->fresh(),
            ];
        });
    }

    /** @return array{lead: Lead, account: Account, contact: Contact|null}|null */
    public function reconcileLeadAccount(Lead $lead, User $user): ?array
    {
        if ($lead->converted_account_id) {
            return null;
        }

        $existingAccount = Account::query()->where('source_lead_id', $lead->id)->first();

        if (! $existingAccount) {
            return null;
        }

        return $this->linkLeadToExistingAccount($lead, $existingAccount, $user);
    }

    public function isEligibleForProvisioning(Lead $lead): bool
    {
        $status = $lead->status instanceof LeadStatus ? $lead->status->value : (string) $lead->status;

        if ($status === LeadStatus::AccountCreated->value) {
            return true;
        }

        if (in_array($status, [
            LeadStatus::Interested->value,
        ], true)) {
            return true;
        }

        $pipelineStage = $lead->pipeline_stage instanceof LeadPipelineStage
            ? $lead->pipeline_stage->value
            : (string) ($lead->pipeline_stage ?? '');

        if (in_array($pipelineStage, [
            LeadPipelineStage::AccountProvisioned->value,
        ], true)) {
            return true;
        }

        if ($pipelineStage === LeadPipelineStage::ReadyForQuotation->value) {
            return true;
        }

        if (in_array($pipelineStage, [
            LeadPipelineStage::MeasurementReview->value,
            LeadPipelineStage::DesignRequired->value,
        ], true)) {
            return true;
        }

        if ($lead->quotationRequests()->exists()) {
            return true;
        }

        if (SiteVisit::query()
            ->where('lead_id', $lead->id)
            ->where('status', SiteVisitStatus::Approved->value)
            ->where(function ($query) {
                $query->where('measurement_context', MeasurementContext::Quotation->value)
                    ->orWhereNull('measurement_context');
            })
            ->exists()) {
            return true;
        }

        return false;
    }

    public function copyLeadPhotosToAccountDocuments(Lead $lead, Account $account, User $user): void
    {
        $photos = LeadPhoto::query()->where('lead_id', $lead->id)->orderBy('sort_order')->get();

        foreach ($photos as $photo) {
            AccountDocument::query()->firstOrCreate(
                [
                    'account_id' => $account->id,
                    'file_path' => $photo->file_path,
                ],
                [
                    'document_type' => 'site_photo',
                    'filename' => basename($photo->file_path),
                    'firebase_url' => $photo->firebase_url,
                    'uploaded_by' => $photo->uploaded_by ?? $user->id,
                ],
            );
        }
    }
}

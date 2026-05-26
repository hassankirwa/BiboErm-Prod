<?php

namespace App\Services\Crm\Leads;

use App\Models\Contact;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LeadContactService
{
    public function createFromLead(Lead $lead, User $user): ?Contact
    {
        if (! $this->shouldCreateContact($lead)) {
            return null;
        }

        $existing = Contact::query()
            ->where('source_lead_id', $lead->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        try {
            $name = trim($lead->contact_person_name ?? '');
            if ($name === '') {
                $name = trim($lead->phone ?? '') ?: trim($lead->email ?? '');
            }
            $parts = preg_split('/\s+/', $name, 2) ?: [];

            return Contact::query()->create([
                'contact_number' => 'CT-'.strtoupper(Str::random(8)),
                'name' => $name,
                'first_name' => $lead->first_name ?? ($parts[0] ?? $name),
                'last_name' => $lead->last_name ?? ($parts[1] ?? null),
                'phone' => $lead->phone,
                'whatsapp' => $lead->whatsapp,
                'email' => $lead->email,
                'job_title' => $lead->job_title,
                'preferred_contact_method' => $lead->preferred_contact_method,
                'status' => 'new_contact',
                'contact_owner_id' => $lead->lead_owner_id ?? $user->id,
                'owner_id' => $lead->lead_owner_id ?? $user->id,
                'source_lead_id' => $lead->id,
                'created_by' => $user->id,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to create contact from lead', [
                'lead_id' => $lead->id,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    protected function shouldCreateContact(Lead $lead): bool
    {
        $name = trim($lead->contact_person_name ?? '');
        $phone = trim($lead->phone ?? '');
        $email = trim($lead->email ?? '');

        return $name !== '' || $phone !== '' || $email !== '';
    }
}

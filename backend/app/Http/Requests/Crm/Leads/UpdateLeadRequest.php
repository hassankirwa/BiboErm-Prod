<?php

namespace App\Http\Requests\Crm\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'lead_type_id' => ['nullable', 'exists:crm_lead_types,id'],
            'lead_source_id' => ['nullable', 'exists:crm_lead_sources,id'],
            'status' => ['nullable', 'string', 'max:64'],
            'priority' => ['nullable', 'string', 'max:20'],
            'lead_owner_id' => ['nullable', 'exists:users,id'],
            'assigned_sales_user_id' => ['nullable', 'exists:users,id'],
            'assigned_field_officer_id' => [
                Rule::requiredIf(fn () => $this->boolean('need_site_visit')),
                'nullable',
                'exists:users,id',
            ],
            'contact_person_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'preferred_contact_method' => ['nullable', 'string', 'max:30'],
            'preferred_contact_time' => ['nullable', 'string', 'max:50'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'account_type' => ['nullable', 'string', 'max:50'],
            'industry' => ['nullable', 'string', 'max:100'],
            'company_phone' => ['nullable', 'string', 'max:50'],
            'company_email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'kra_pin' => ['nullable', 'string', 'max:50'],
            'billing_address' => ['nullable', 'string'],
            'product_interests' => ['sometimes', 'array', 'min:1'],
            'product_interests.*' => ['string', 'max:64'],
            'requirement_description' => ['sometimes', 'nullable', 'string'],
            'property_site_type' => ['nullable', 'string', 'max:50'],
            'estimated_scope' => ['nullable', 'string', 'max:255'],
            'estimated_budget' => ['nullable', 'numeric', 'min:0'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'expected_timeline' => ['nullable', 'string', 'max:50'],
            'urgency' => ['nullable', 'string', 'max:20'],
            'site_name' => ['nullable', 'string', 'max:255'],
            'site_address' => ['nullable', 'string'],
            'county_id' => ['nullable', 'exists:crm_counties,id'],
            'area_estate' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'site_contact_name' => ['nullable', 'string', 'max:255'],
            'site_contact_phone' => ['nullable', 'string', 'max:50'],
            'has_budget' => ['nullable', 'string', 'max:20'],
            'decision_maker_identified' => ['nullable', 'string', 'max:20'],
            'has_existing_supplier' => ['nullable', 'string', 'max:20'],
            'need_site_visit' => ['sometimes', 'boolean'],
            'expected_decision_date' => ['nullable', 'date'],
            'lead_quality_score' => ['nullable', 'string', 'max:20'],
            'qualification_notes' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string', 'max:50'],
            'next_follow_up_at' => ['nullable', 'date'],
            'internal_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'source' => ['nullable', 'string', 'max:64'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ];
    }
}

<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class LeadDetailResource extends LeadResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'whatsapp' => $this->whatsapp,
            'job_title' => $this->job_title,
            'preferred_contact_method' => $this->preferred_contact_method,
            'preferred_contact_time' => $this->preferred_contact_time,
            'account_type' => $this->account_type,
            'industry' => $this->industry,
            'company_phone' => $this->company_phone,
            'company_email' => $this->company_email,
            'website' => $this->website,
            'kra_pin' => $this->kra_pin,
            'billing_address' => $this->billing_address,
            'requirement_description' => $this->requirement_description,
            'property_site_type' => $this->property_site_type,
            'building_construction_stage_id' => $this->building_construction_stage_id,
            'building_construction_stage' => $this->whenLoaded('buildingConstructionStage', fn () => [
                'id' => $this->buildingConstructionStage->id,
                'slug' => $this->buildingConstructionStage->slug,
                'label' => $this->buildingConstructionStage->label,
            ]),
            'photos' => LeadPhotoResource::collection($this->whenLoaded('photos')),
            'estimated_scope' => $this->estimated_scope,
            'expected_timeline' => $this->expected_timeline,
            'urgency' => $this->urgency,
            'site_name' => $this->site_name,
            'subcounty' => $this->subcounty,
            'ward' => $this->ward,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'area_estate' => $this->area_estate,
            'landmark' => $this->landmark,
            'site_contact_name' => $this->site_contact_name,
            'site_contact_phone' => $this->site_contact_phone,
            'has_budget' => $this->has_budget,
            'decision_maker_identified' => $this->decision_maker_identified,
            'has_existing_supplier' => $this->has_existing_supplier,
            'expected_decision_date' => $this->expected_decision_date?->toDateString(),
            'lead_quality_score' => $this->lead_quality_score,
            'qualification_notes' => $this->qualification_notes,
            'next_action' => $this->next_action,
            'internal_notes' => $this->internal_notes,
            'notes' => $this->notes,
            'source' => $this->source,
            'source_contact' => new ContactResource($this->whenLoaded('sourceContact')),
            'linked_contacts' => ContactResource::collection(
                $this->when(
                    $this->relationLoaded('sourceContacts')
                        || ($this->relationLoaded('convertedAccount') && $this->convertedAccount?->relationLoaded('contacts'))
                        || $this->relationLoaded('convertedContact'),
                    fn () => $this->resolveLinkedContacts(),
                ),
            ),
            'converted_at' => $this->converted_at?->toIso8601String(),
            'converted_contact_id' => $this->converted_contact_id,
            'converted_account_id' => $this->converted_account_id,
            'converted_deal_id' => $this->converted_deal_id,
            'converted_contact' => new ContactResource($this->whenLoaded('convertedContact')),
            'converted_account' => new AccountResource($this->whenLoaded('convertedAccount')),
            'converted_deal' => new DealResource($this->whenLoaded('convertedDeal')),
            'latest_quotation' => $this->when(
                isset($this->sales_context['latest_quotation']) && $this->sales_context['latest_quotation'],
                fn () => new QuotationSummaryResource($this->sales_context['latest_quotation']),
            ),
            'sales_deal' => $this->when(
                isset($this->sales_context['sales_deal']) && $this->sales_context['sales_deal'],
                fn () => new DealResource($this->sales_context['sales_deal']),
            ),
            'site_visits' => SiteVisitResource::collection($this->whenLoaded('siteVisits')),
            'related_record_counts' => $this->when(
                $this->relationLoaded('siteVisits')
                    || $this->relationLoaded('measurementReports')
                    || $this->relationLoaded('designJobs')
                    || $this->relationLoaded('quotationRequests'),
                fn () => [
                    'site_visits' => $this->relationLoaded('siteVisits') ? $this->siteVisits->count() : null,
                    'measurement_reports' => $this->relationLoaded('measurementReports') ? $this->measurementReports->count() : null,
                    'design_jobs' => $this->relationLoaded('designJobs') ? $this->designJobs->count() : null,
                    'quotation_requests' => $this->relationLoaded('quotationRequests') ? $this->quotationRequests->count() : null,
                ],
            ),
            'attachments' => $this->whenLoaded('attachments'),
            'activities' => $this->whenLoaded('activities'),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'creator' => new UserResource($this->whenLoaded('creator')),
        ]);
    }
}
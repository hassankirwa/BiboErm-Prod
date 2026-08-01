<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'project_name' => $this->project_name,
            'project_number' => $this->project_number,
            'deal_id' => $this->deal_id,
            'account_id' => $this->account_id,
            'contact_id' => $this->contact_id,
            'prepared_by' => $this->prepared_by,
            'status' => $this->status?->value ?? $this->status,
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'tax_rate' => $this->tax_rate,
            'pricing_currency' => $this->hasUsdPricing() ? 'USD' : 'KES',
            'total_amount' => $this->total_amount,
            'total_amount_kes' => $this->totalAmountKes(),
            'exchange_rate' => $this->hasUsdPricing() ? $this->usdToKesRate() : null,
            'valid_until' => $this->valid_until?->toDateString(),
            'terms_conditions' => $this->terms_conditions,
            'source_excel_path' => $this->source_excel_path,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'approved_by' => $this->approved_by,
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'revision_of_id' => $this->revision_of_id,
            'revision_number' => $this->revision_number ?? 1,
            'revision_label' => $this->revisionLabel(),
            'is_reference_copy' => (bool) ($this->is_reference_copy ?? false),
            'root_quotation_id' => $this->root_quotation_id,
            'negotiation_notes' => $this->negotiation_notes ?? [],
            'project_id' => $this->deal?->project_id,
            'deal' => new DealResource($this->whenLoaded('deal')),
            'revision_history' => $this->when(
                $this->relationLoaded('revisionHistory'),
                fn () => QuotationResource::collection($this->revisionHistory),
            ),
            'account' => new AccountResource($this->whenLoaded('account')),
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'prepared_by_user' => new UserResource($this->whenLoaded('preparedBy')),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(function ($line) {
                $picture = self::resolveLinePictureFields([
                    'metadata' => $line->metadata,
                ]);

                return [
                    'id' => $line->id,
                    'quotation_id' => $line->quotation_id,
                    'description' => $line->description,
                    'series' => $line->series,
                    'code' => $line->code,
                    'glass_type' => $line->glass_type,
                    'width_mm' => $line->width_mm,
                    'height_mm' => $line->height_mm,
                    'sqm_per_pcs' => $line->sqm_per_pcs,
                    'total_sqm' => $line->total_sqm,
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    'line_total' => $line->line_total,
                    'measurement_line_id' => $line->measurement_line_id,
                    'sort_order' => $line->sort_order,
                    'metadata' => $line->metadata,
                    'picture_data_url' => $picture['picture_data_url'] ?? null,
                ];
            })),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $line
     * @return array{picture_data_url?: string}
     */
    private static function resolveLinePictureFields(array $line): array
    {
        $metadata = is_array($line['metadata'] ?? null) ? $line['metadata'] : [];

        foreach (['accounting', 'fabrication'] as $section) {
            $dataUrl = $metadata[$section]['drawing']['embedded_media']['data_url'] ?? null;
            if (is_string($dataUrl) && str_starts_with($dataUrl, 'data:')) {
                return ['picture_data_url' => $dataUrl];
            }
        }

        return [];
    }
}

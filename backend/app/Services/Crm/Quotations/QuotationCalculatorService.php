<?php

namespace App\Services\Crm\Quotations;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\QuotationStatus;
use App\Models\Deal;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class QuotationCalculatorService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function createForDeal(Deal $deal, User $user, array $data): Quotation
    {
        return DB::transaction(function () use ($deal, $user, $data) {
            $lines = $data['lines'] ?? [];
            $subtotal = 0;

            foreach ($lines as $line) {
                $lineTotal = ($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0);
                $subtotal += $lineTotal;
            }

            $discount = (float) ($data['discount_amount'] ?? 0);
            $tax = (float) ($data['tax_amount'] ?? 0);
            $total = $subtotal - $discount + $tax;

            $quotation = Quotation::query()->create([
                'quotation_number' => 'QT-'.strtoupper(Str::random(8)),
                'deal_id' => $deal->id,
                'account_id' => $deal->account_id,
                'contact_id' => $deal->primary_contact_id ?? $deal->contact_id,
                'prepared_by' => $user->id,
                'status' => QuotationStatus::Draft->value,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'tax_amount' => $tax,
                'total_amount' => $total,
                'valid_until' => $data['valid_until'] ?? null,
                'terms_conditions' => $data['terms_conditions'] ?? null,
                'revision_of_id' => $data['revision_of_id'] ?? null,
            ]);

            foreach ($lines as $index => $line) {
                $lineTotal = ($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0);

                QuotationLine::query()->create([
                    'quotation_id' => $quotation->id,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'line_total' => $lineTotal,
                    'measurement_line_id' => $line['measurement_line_id'] ?? null,
                    'sort_order' => $line['sort_order'] ?? $index,
                ]);
            }

            $deal->update([
                'stage' => DealStage::QuotationPreparation->value,
                'quotation_amount' => $total,
            ]);

            return $quotation->load(['lines', 'deal', 'account', 'contact']);
        });
    }

    public function send(Quotation $quotation, ?User $user = null): Quotation
    {
        $quotation->update([
            'status' => QuotationStatus::Sent->value,
            'sent_at' => now(),
        ]);

        $quotation->deal?->update(['stage' => DealStage::QuotationSent->value]);

        $quotation = $quotation->fresh()->load(['lines', 'deal']);

        $this->crmAudit->quotationSent($quotation, $user);

        return $quotation;
    }

    public function revise(Quotation $quotation, User $user, array $data): Quotation
    {
        $lines = $data['lines'] ?? $quotation->lines->map(fn ($line) => [
            'description' => $line->description,
            'quantity' => $line->quantity,
            'unit_price' => $line->unit_price,
            'measurement_line_id' => $line->measurement_line_id,
            'sort_order' => $line->sort_order,
        ])->all();

        $quotation->update(['status' => QuotationStatus::Revised->value]);

        return $this->createForDeal(
            $quotation->deal,
            $user,
            [
                ...$data,
                'lines' => $lines,
                'revision_of_id' => $quotation->id,
            ],
        );
    }

    public function accept(Quotation $quotation): Quotation
    {
        $quotation->update([
            'status' => QuotationStatus::Accepted->value,
            'accepted_at' => now(),
        ]);

        $quotation->deal?->update([
            'stage' => DealStage::Accepted->value,
            'final_agreed_amount' => $quotation->total_amount,
        ]);

        return $quotation->fresh()->load(['lines', 'deal']);
    }

    public function updateDraft(Quotation $quotation, array $data): Quotation
    {
        $status = $quotation->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) $quotation->status);

        if ($status !== QuotationStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Only draft quotations can be updated.'],
            ]);
        }

        return DB::transaction(function () use ($quotation, $data) {
            if (array_key_exists('lines', $data)) {
                $quotation->lines()->delete();
                $subtotal = 0;

                foreach ($data['lines'] as $index => $line) {
                    $lineTotal = ($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0);
                    $subtotal += $lineTotal;

                    QuotationLine::query()->create([
                        'quotation_id' => $quotation->id,
                        'description' => $line['description'],
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'line_total' => $lineTotal,
                        'measurement_line_id' => $line['measurement_line_id'] ?? null,
                        'sort_order' => $line['sort_order'] ?? $index,
                    ]);
                }

                $discount = (float) ($data['discount_amount'] ?? $quotation->discount_amount ?? 0);
                $tax = (float) ($data['tax_amount'] ?? $quotation->tax_amount ?? 0);
                $total = $subtotal - $discount + $tax;

                $quotation->update([
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'tax_amount' => $tax,
                    'total_amount' => $total,
                ]);

                $quotation->deal?->update(['quotation_amount' => $total]);
            }

            $headerUpdates = [];

            foreach (['valid_until', 'terms_conditions', 'discount_amount', 'tax_amount'] as $field) {
                if (array_key_exists($field, $data)) {
                    $headerUpdates[$field] = $data[$field];
                }
            }

            if ($headerUpdates !== []) {
                $quotation->update($headerUpdates);
            }

            return $quotation->fresh()->load(['lines', 'deal', 'account', 'contact']);
        });
    }
}

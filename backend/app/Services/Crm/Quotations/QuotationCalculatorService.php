<?php

namespace App\Services\Crm\Quotations;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\QuotationStatus;
use App\Models\Deal;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Deals\DealFromQuotationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class QuotationCalculatorService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected DealFromQuotationService $dealFromQuotation,
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

    public function createForAccount(\App\Models\Account $account, User $user, array $data): Quotation
    {
        return DB::transaction(function () use ($account, $user, $data) {
            $lines = $data['lines'] ?? [];
            $subtotal = 0;

            foreach ($lines as $line) {
                $subtotal += ($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0);
            }

            $discount = (float) ($data['discount_amount'] ?? 0);
            $tax = (float) ($data['tax_amount'] ?? 0);
            $total = $subtotal - $discount + $tax;

            $quotation = Quotation::query()->create([
                'quotation_number' => 'QT-'.strtoupper(Str::random(8)),
                'deal_id' => null,
                'account_id' => $account->id,
                'contact_id' => $data['contact_id'] ?? $account->primary_contact_id,
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

            return $quotation->load(['lines', 'account', 'contact']);
        });
    }

    public function createStructuredForAccount(\App\Models\Account $account, User $user, array $data): Quotation
    {
        return DB::transaction(function () use ($account, $user, $data) {
            $lines = $data['lines'] ?? [];
            $subtotal = 0.0;

            foreach ($lines as $line) {
                $subtotal += (float) ($line['line_total'] ?? (($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0)));
            }

            $discount = (float) ($data['discount_amount'] ?? 0);
            $tax = (float) ($data['tax_amount'] ?? 0);
            $total = $subtotal - $discount + $tax;

            $quotation = Quotation::query()->create([
                'quotation_number' => 'QT-'.strtoupper(Str::random(8)),
                'deal_id' => null,
                'account_id' => $account->id,
                'contact_id' => $data['contact_id'] ?? $account->primary_contact_id,
                'prepared_by' => $user->id,
                'project_name' => $data['project_name'] ?? $account->name,
                'project_number' => $data['project_number'] ?? null,
                'status' => QuotationStatus::Draft->value,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'tax_amount' => $tax,
                'tax_rate' => $data['tax_rate'] ?? config('bibo.quotation.default_tax_rate', 16),
                'total_amount' => $total,
                'valid_until' => $data['valid_until'] ?? null,
                'terms_conditions' => $data['terms_conditions'] ?? null,
                'source_excel_path' => $data['source_excel_path'] ?? null,
                'revision_of_id' => $data['revision_of_id'] ?? null,
            ]);

            foreach ($lines as $index => $line) {
                $lineTotal = (float) ($line['line_total'] ?? (($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0)));

                QuotationLine::query()->create([
                    'quotation_id' => $quotation->id,
                    'description' => $line['description'],
                    'series' => $line['series'] ?? null,
                    'code' => $line['code'] ?? null,
                    'glass_type' => $line['glass_type'] ?? null,
                    'width_mm' => $line['width_mm'] ?? null,
                    'height_mm' => $line['height_mm'] ?? null,
                    'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                    'total_sqm' => $line['total_sqm'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'line_total' => $lineTotal,
                    'measurement_line_id' => $line['measurement_line_id'] ?? null,
                    'sort_order' => $line['sort_order'] ?? $index,
                    'metadata' => $line['metadata'] ?? null,
                ]);
            }

            return $quotation->load(['lines', 'account', 'contact']);
        });
    }

    public function send(Quotation $quotation, ?User $user = null): Quotation
    {
        if ($quotation->is_reference_copy) {
            throw ValidationException::withMessages([
                'quotation' => ['Reference copies cannot be sent.'],
            ]);
        }

        $status = $quotation->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) $quotation->status);

        if (! in_array($status, [QuotationStatus::Draft, QuotationStatus::Revised], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only draft or revised quotations can be sent.'],
            ]);
        }

        $quotation->update([
            'status' => QuotationStatus::Sent->value,
            'sent_at' => now(),
            'revision_number' => $quotation->revision_number ?: 1,
        ]);

        if (! $quotation->root_quotation_id) {
            $quotation->update(['root_quotation_id' => $quotation->id]);
        }

        $quotation = $quotation->fresh()->load(['lines', 'deal', 'account']);

        if (! $quotation->deal_id && $user) {
            $this->dealFromQuotation->createFromQuotation($quotation, $user);
            $quotation = $quotation->fresh()->load(['lines', 'deal', 'account']);
        } else {
            $quotation->deal?->update([
                'stage' => DealStage::QuotationSent->value,
                'quotation_amount' => $quotation->total_amount,
            ]);
        }

        $this->crmAudit->quotationSent($quotation, $user);

        return $quotation;
    }

    public function appendNegotiationNote(Quotation $quotation, User $user, string $body): Quotation
    {
        if ($quotation->is_reference_copy) {
            throw ValidationException::withMessages([
                'quotation' => ['Negotiation notes cannot be added to reference copies.'],
            ]);
        }

        $status = $quotation->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) $quotation->status);

        if (! in_array($status, [
            QuotationStatus::Sent,
            QuotationStatus::RevisionRequested,
            QuotationStatus::Revised,
            QuotationStatus::Accepted,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Negotiation notes can only be added after the quotation has been sent.'],
            ]);
        }

        $notes = $quotation->negotiation_notes ?? [];
        $notes[] = [
            'id' => (string) Str::ulid(),
            'body' => $body,
            'author_id' => $user->id,
            'author_name' => $user->name,
            'created_at' => now()->toIso8601String(),
        ];

        $quotation->update(['negotiation_notes' => $notes]);

        $quotation->deal?->update(['stage' => DealStage::NegotiationRevision->value]);

        return $quotation->fresh()->load(['lines', 'deal', 'account']);
    }

    public function revise(Quotation $quotation, User $user, array $data): Quotation
    {
        if ($quotation->is_reference_copy) {
            throw ValidationException::withMessages([
                'quotation' => ['Reference copies cannot be revised.'],
            ]);
        }

        $status = $quotation->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) $quotation->status);

        if (! in_array($status, [
            QuotationStatus::Sent,
            QuotationStatus::RevisionRequested,
            QuotationStatus::Revised,
            QuotationStatus::Accepted,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only sent quotations can be revised.'],
            ]);
        }

        return DB::transaction(function () use ($quotation, $user, $data) {
            $lines = $data['lines'] ?? $quotation->lines->map(fn ($line) => [
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
            ])->all();

            $rootId = $quotation->threadRootId();
            $nextRevision = ($quotation->revision_number ?: 1) + 1;

            $newQuotation = Quotation::query()->create([
                'quotation_number' => 'QT-'.strtoupper(Str::random(8)),
                'deal_id' => $quotation->deal_id,
                'account_id' => $quotation->account_id,
                'contact_id' => $quotation->contact_id,
                'prepared_by' => $user->id,
                'project_name' => $data['project_name'] ?? $quotation->project_name,
                'project_number' => $data['project_number'] ?? $quotation->project_number,
                'status' => QuotationStatus::Draft->value,
                'subtotal' => $quotation->subtotal,
                'discount_amount' => $data['discount_amount'] ?? $quotation->discount_amount,
                'tax_amount' => $data['tax_amount'] ?? $quotation->tax_amount,
                'tax_rate' => $quotation->tax_rate,
                'total_amount' => $quotation->total_amount,
                'valid_until' => $data['valid_until'] ?? $quotation->valid_until,
                'terms_conditions' => $data['terms_conditions'] ?? $quotation->terms_conditions,
                'source_excel_path' => $quotation->source_excel_path,
                'revision_of_id' => $quotation->id,
                'revision_number' => $nextRevision,
                'is_reference_copy' => false,
                'root_quotation_id' => $rootId,
                'negotiation_notes' => $quotation->negotiation_notes,
            ]);

            foreach ($lines as $index => $line) {
                $lineTotal = (float) ($line['line_total'] ?? (($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0)));

                QuotationLine::query()->create([
                    'quotation_id' => $newQuotation->id,
                    'description' => $line['description'],
                    'series' => $line['series'] ?? null,
                    'code' => $line['code'] ?? null,
                    'glass_type' => $line['glass_type'] ?? null,
                    'width_mm' => $line['width_mm'] ?? null,
                    'height_mm' => $line['height_mm'] ?? null,
                    'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                    'total_sqm' => $line['total_sqm'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'line_total' => $lineTotal,
                    'measurement_line_id' => $line['measurement_line_id'] ?? null,
                    'sort_order' => $line['sort_order'] ?? $index,
                    'metadata' => $line['metadata'] ?? null,
                ]);
            }

            $this->recalculateTotals($newQuotation, $data);

            $quotation->update([
                'is_reference_copy' => true,
                'root_quotation_id' => $rootId,
            ]);

            $quotation->deal?->update([
                'stage' => DealStage::NegotiationRevision->value,
                'quotation_amount' => $newQuotation->fresh()->total_amount,
            ]);

            return $newQuotation->fresh()->load(['lines', 'deal', 'account', 'contact']);
        });
    }

    public function revisionHistory(Quotation $quotation): \Illuminate\Support\Collection
    {
        $rootId = $quotation->threadRootId();

        return Quotation::query()
            ->where('root_quotation_id', $rootId)
            ->where('is_reference_copy', true)
            ->with(['lines', 'preparedBy'])
            ->orderBy('revision_number')
            ->orderBy('id')
            ->get();
    }

    protected function recalculateTotals(Quotation $quotation, array $data): void
    {
        $quotation->load('lines');
        $subtotal = (float) $quotation->lines->sum('line_total');
        $discount = (float) ($data['discount_amount'] ?? $quotation->discount_amount ?? 0);
        $tax = (float) ($data['tax_amount'] ?? $quotation->tax_amount ?? 0);
        $total = $subtotal - $discount + $tax;

        $quotation->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'total_amount' => $total,
        ]);
    }

    public function accept(Quotation $quotation): Quotation
    {
        $quotation->update([
            'status' => QuotationStatus::Accepted->value,
            'accepted_at' => now(),
        ]);

        if ($quotation->deal) {
            $quotation->deal->update([
                'final_agreed_amount' => $quotation->total_amount,
                'quotation_amount' => $quotation->total_amount,
            ]);
        }

        return $quotation->fresh()->load(['lines', 'deal']);
    }

    public function updateDraft(Quotation $quotation, array $data): Quotation
    {
        if ($quotation->is_reference_copy) {
            throw ValidationException::withMessages([
                'quotation' => ['Reference copies are immutable.'],
            ]);
        }

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
                        'series' => $line['series'] ?? null,
                        'code' => $line['code'] ?? null,
                        'glass_type' => $line['glass_type'] ?? null,
                        'width_mm' => $line['width_mm'] ?? null,
                        'height_mm' => $line['height_mm'] ?? null,
                        'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                        'total_sqm' => $line['total_sqm'] ?? null,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'line_total' => $lineTotal,
                        'measurement_line_id' => $line['measurement_line_id'] ?? null,
                        'sort_order' => $line['sort_order'] ?? $index,
                        'metadata' => $line['metadata'] ?? null,
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

    public function updateStructuredDraft(Quotation $quotation, array $data): Quotation
    {
        if ($quotation->is_reference_copy) {
            throw ValidationException::withMessages([
                'quotation' => ['Reference copies are immutable.'],
            ]);
        }

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
                $subtotal = 0.0;

                foreach ($data['lines'] as $index => $line) {
                    $lineTotal = ($line['quantity'] ?? 1) * ($line['unit_price'] ?? 0);
                    $subtotal += $lineTotal;
                    $totalSqm = array_key_exists('total_sqm', $line)
                        ? (float) $line['total_sqm']
                        : (($line['sqm_per_pcs'] ?? 0) * ($line['quantity'] ?? 1));

                    QuotationLine::query()->create([
                        'quotation_id' => $quotation->id,
                        'description' => $line['description'],
                        'series' => $line['series'] ?? null,
                        'code' => $line['code'] ?? null,
                        'glass_type' => $line['glass_type'] ?? null,
                        'width_mm' => $line['width_mm'] ?? null,
                        'height_mm' => $line['height_mm'] ?? null,
                        'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                        'total_sqm' => $totalSqm ?: null,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'line_total' => $lineTotal,
                        'measurement_line_id' => $line['measurement_line_id'] ?? null,
                        'sort_order' => $line['sort_order'] ?? $index,
                        'metadata' => $line['metadata'] ?? null,
                    ]);
                }

                $discount = (float) ($data['discount_amount'] ?? $quotation->discount_amount ?? 0);
                $taxRate = (float) ($data['tax_rate'] ?? $quotation->tax_rate ?? config('bibo.quotation.default_tax_rate', 16));
                $tax = array_key_exists('tax_amount', $data)
                    ? (float) $data['tax_amount']
                    : round(max($subtotal - $discount, 0) * ($taxRate / 100), 2);
                $total = $subtotal - $discount + $tax;

                $quotation->update([
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'tax_amount' => $tax,
                    'tax_rate' => $taxRate,
                    'total_amount' => $total,
                ]);

                $quotation->deal?->update(['quotation_amount' => $total]);
            }

            $headerUpdates = [];

            foreach (['valid_until', 'terms_conditions', 'discount_amount', 'tax_amount', 'tax_rate', 'project_name', 'project_number'] as $field) {
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

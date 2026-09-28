<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HistoricalLeadImportService
{
    /** Progress values imported as open quotes (not Lost). */
    public const OPEN_PROGRESS = [
        'draft',
        'sent',
        'awaiting feedback',
        'negotiating',
        'revised',
        'on hold',
    ];

    public const WON_PROGRESS = 'won';

    public const SKIP_PROGRESS = ['lost'];

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{
     *     imported: int,
     *     skipped: int,
     *     leads: list<array{id: int, lead_number: string, name: string}>,
     *     skipped_rows: list<array{reason: string, name?: string|null, phone?: string|null, external_quote_no?: string|null}>
     * }
     */
    public function import(array $rows, User $user): array
    {
        $created = [];
        $skipped = [];
        $knownPhones = $this->loadNormalizedPhones();
        $knownQuoteNos = Lead::query()
            ->whereNotNull('external_quote_no')
            ->where('external_quote_no', '!=', '')
            ->pluck('external_quote_no')
            ->map(fn ($v) => strtolower((string) $v))
            ->flip()
            ->all();

        DB::transaction(function () use ($rows, $user, &$created, &$skipped, &$knownPhones, &$knownQuoteNos) {
            foreach ($rows as $row) {
                $result = $this->importOne($row, $user, $knownPhones, $knownQuoteNos);
                if ($result['status'] === 'created') {
                    $created[] = $result['lead'];
                    $phone = $this->normalizePhone(trim((string) ($row['phone'] ?? '')));
                    if ($phone !== null) {
                        $knownPhones[$phone] = true;
                    }
                    $quoteNo = $this->nullableString($row['external_quote_no'] ?? $row['quote_no'] ?? null);
                    if ($quoteNo !== null) {
                        $knownQuoteNos[strtolower($quoteNo)] = true;
                    }
                } else {
                    $skipped[] = $result['skip'];
                }
            }
        });

        return [
            'imported' => count($created),
            'skipped' => count($skipped),
            'leads' => $created,
            'skipped_rows' => $skipped,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, true>  $knownPhones
     * @param  array<string, true>  $knownQuoteNos
     * @return array{status: 'created', lead: array{id: int, lead_number: string, name: string}}|array{status: 'skipped', skip: array{reason: string, name?: string|null, phone?: string|null, external_quote_no?: string|null}}
     */
    protected function importOne(array $row, User $user, array &$knownPhones, array &$knownQuoteNos): array
    {
        $progress = $this->normalizeProgress($row['progress'] ?? null);
        $name = trim((string) ($row['name'] ?? $row['customer_name'] ?? ''));
        $phoneRaw = trim((string) ($row['phone'] ?? ''));
        $quoteNo = $this->nullableString($row['external_quote_no'] ?? $row['quote_no'] ?? null);

        if ($progress === null || $progress === '') {
            return $this->skip('missing_progress', $name, $phoneRaw, $quoteNo);
        }

        if (in_array($progress, self::SKIP_PROGRESS, true)) {
            return $this->skip('lost', $name, $phoneRaw, $quoteNo);
        }

        $isWon = $progress === self::WON_PROGRESS;
        $isOpen = in_array($progress, self::OPEN_PROGRESS, true);

        if (! $isWon && ! $isOpen) {
            return $this->skip('unsupported_progress', $name, $phoneRaw, $quoteNo);
        }

        if ($name === '') {
            return $this->skip('missing_name', $name, $phoneRaw, $quoteNo);
        }

        $phone = $this->normalizePhone($phoneRaw);
        if ($phone === null) {
            return $this->skip('missing_or_invalid_phone', $name, $phoneRaw, $quoteNo);
        }

        if ($quoteNo !== null && isset($knownQuoteNos[strtolower($quoteNo)])) {
            return $this->skip('duplicate_quote_no', $name, $phoneRaw, $quoteNo);
        }

        if (isset($knownPhones[$phone])) {
            return $this->skip('duplicate_phone', $name, $phoneRaw, $quoteNo);
        }

        $pipelineStage = $this->mapProgressToPipelineStage($progress);
        $status = $isWon ? LeadStatus::Converted->value : LeadStatus::Interested->value;
        $estimatedValue = $this->toDecimal($row['estimated_value'] ?? $row['total_quotation_amount'] ?? null);
        $amountPaid = $isWon ? $estimatedValue : null;
        $quoteDate = $this->parseDate($row['quote_date'] ?? null);
        $projectName = $this->nullableString($row['project_name'] ?? $row['account_name'] ?? $row['site_name'] ?? null);
        $source = $this->nullableString($row['source'] ?? $row['lead_source'] ?? null);
        $notes = $this->buildNotes($row);

        $leadNumber = app(LeadNumberGenerator::class)->generate();

        $lead = Lead::query()->create([
            'name' => $name,
            'contact_person_name' => $name,
            'first_name' => explode(' ', $name)[0] ?? $name,
            'phone' => $phoneRaw !== '' ? $phoneRaw : $phone,
            'account_name' => $projectName ?? $name,
            'site_name' => $projectName,
            'source' => $source,
            'estimated_value' => $estimatedValue,
            'amount_paid' => $amountPaid,
            'quote_date' => $quoteDate,
            'external_quote_no' => $quoteNo,
            'is_historical' => true,
            'pipeline_stage' => $pipelineStage,
            'status' => $status,
            'reference' => $leadNumber,
            'lead_number' => $leadNumber,
            'need_site_visit' => false,
            'product_interests' => ['custom'],
            'requirement_description' => $notes ?: ($projectName ?? $name),
            'notes' => $notes,
            'lead_owner_id' => $user->id,
            'assigned_to' => $user->id,
            'created_by' => $user->id,
        ]);

        return [
            'status' => 'created',
            'lead' => [
                'id' => $lead->id,
                'lead_number' => (string) $lead->lead_number,
                'name' => (string) $lead->name,
            ],
        ];
    }

    /**
     * @return array{status: 'skipped', skip: array{reason: string, name?: string|null, phone?: string|null, external_quote_no?: string|null}}
     */
    protected function skip(string $reason, ?string $name, ?string $phone, ?string $quoteNo): array
    {
        return [
            'status' => 'skipped',
            'skip' => [
                'reason' => $reason,
                'name' => $name ?: null,
                'phone' => $phone ?: null,
                'external_quote_no' => $quoteNo,
            ],
        ];
    }

    public function mapProgressToPipelineStage(string $progress): string
    {
        return match ($progress) {
            'draft' => LeadPipelineStage::ReadyForQuotation->value,
            'sent', 'awaiting feedback' => LeadPipelineStage::ProformaSent->value,
            'negotiating' => LeadPipelineStage::AwaitingDeposit->value,
            'revised' => LeadPipelineStage::ProformaCreated->value,
            'on hold' => LeadPipelineStage::Cold->value,
            'won' => LeadPipelineStage::DealWon->value,
            default => LeadPipelineStage::ReadyForQuotation->value,
        };
    }

    public function normalizeProgress(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = strtolower(trim((string) $value));
        $normalized = preg_replace('/\s+/', ' ', $normalized) ?? $normalized;

        return $normalized === '' ? null : $normalized;
    }

    public function normalizePhone(string $raw): ?string
    {
        $trimmed = trim($raw);
        if ($trimmed === '' || strtolower($trimmed) === 'email') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        if (strlen($digits) < 7) {
            return null;
        }

        // Normalize Kenyan-style numbers: +2547… / 07… → 7…
        if (str_starts_with($digits, '254') && strlen($digits) >= 12) {
            $digits = substr($digits, 3);
        }
        if (str_starts_with($digits, '0') && strlen($digits) >= 9) {
            $digits = ltrim($digits, '0');
        }

        if (strlen($digits) < 7) {
            return null;
        }

        return $digits;
    }

    /** @return array<string, true> */
    protected function loadNormalizedPhones(): array
    {
        $phones = [];
        Lead::query()
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->pluck('phone')
            ->each(function ($raw) use (&$phones) {
                $normalized = $this->normalizePhone((string) $raw);
                if ($normalized !== null) {
                    $phones[$normalized] = true;
                }
            });

        return $phones;
    }

    protected function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $str = trim((string) $value);

        return $str === '' ? null : $str;
    }

    protected function toDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return round((float) $value, 2);
        }
        $cleaned = preg_replace('/[^\d.-]/', '', (string) $value) ?? '';
        if ($cleaned === '' || ! is_numeric($cleaned)) {
            return null;
        }

        return round((float) $cleaned, 2);
    }

    protected function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            if ($value instanceof \DateTimeInterface) {
                return Carbon::instance(\DateTimeImmutable::createFromInterface($value))->toDateString();
            }

            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function buildNotes(array $row): ?string
    {
        $parts = [];
        foreach ([
            'Door & Window Series' => $row['series'] ?? $row['door_window_series'] ?? null,
            'Total Sets' => $row['total_sets'] ?? null,
            'Total SQM' => $row['total_sqm'] ?? null,
            'Sales Rep' => $row['sales_rep'] ?? null,
            'Customer Feedback' => $row['customer_feedback'] ?? null,
            'Remarks' => $row['remarks'] ?? null,
        ] as $label => $value) {
            $str = $this->nullableString($value);
            if ($str !== null) {
                $parts[] = "{$label}: {$str}";
            }
        }

        return $parts === [] ? null : implode("\n", $parts);
    }
}

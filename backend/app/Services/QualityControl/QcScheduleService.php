<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcScheduleFrequency;
use App\Events\QualityControl\QcScheduleDue;
use App\Models\QualityControl\QcInspectionSchedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class QcScheduleService
{
    public function __construct(
        protected QcAuditLogger $audit,
    ) {}

    public function create(User $user, array $data): QcInspectionSchedule
    {
        $frequency = QcScheduleFrequency::from($data['frequency']);
        $interval = max(1, (int) ($data['frequency_interval'] ?? 1));
        $nextDue = isset($data['next_due_at'])
            ? Carbon::parse($data['next_due_at'])
            : $this->calculateNextDueAt($frequency, $interval, now());

        $schedule = QcInspectionSchedule::query()->create([
            'name' => $data['name'],
            'context' => QcInspectionContext::from($data['context']),
            'frequency' => $frequency,
            'frequency_interval' => $interval,
            'warehouse_deck_slug' => $data['warehouse_deck_slug'] ?? null,
            'warehouse_section_id' => $data['warehouse_section_id'] ?? null,
            'tool_scope' => $data['tool_scope'] ?? 'all',
            'assigned_role' => $data['assigned_role'] ?? null,
            'assigned_user_id' => $data['assigned_user_id'] ?? null,
            'template_id' => $data['template_id'] ?? null,
            'next_due_at' => $nextDue,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $user->id,
        ]);

        $this->audit->log('qc.schedule_created', $schedule);

        return $schedule;
    }

    public function update(QcInspectionSchedule $schedule, array $data): QcInspectionSchedule
    {
        $updates = array_filter([
            'name' => $data['name'] ?? null,
            'frequency' => isset($data['frequency']) ? QcScheduleFrequency::from($data['frequency']) : null,
            'frequency_interval' => $data['frequency_interval'] ?? null,
            'warehouse_deck_slug' => array_key_exists('warehouse_deck_slug', $data) ? $data['warehouse_deck_slug'] : null,
            'warehouse_section_id' => array_key_exists('warehouse_section_id', $data) ? $data['warehouse_section_id'] : null,
            'tool_scope' => $data['tool_scope'] ?? null,
            'assigned_role' => array_key_exists('assigned_role', $data) ? $data['assigned_role'] : null,
            'assigned_user_id' => array_key_exists('assigned_user_id', $data) ? $data['assigned_user_id'] : null,
            'template_id' => array_key_exists('template_id', $data) ? $data['template_id'] : null,
            'next_due_at' => isset($data['next_due_at']) ? Carbon::parse($data['next_due_at']) : null,
            'is_active' => $data['is_active'] ?? null,
        ], fn ($value) => $value !== null);

        if ($updates !== []) {
            $schedule->update($updates);
        }

        return $schedule->fresh();
    }

    public function markRunComplete(QcInspectionSchedule $schedule): QcInspectionSchedule
    {
        $now = now();
        $nextDue = $this->calculateNextDueAt(
            $schedule->frequency,
            $schedule->frequency_interval,
            $now,
        );

        $schedule->update([
            'last_run_at' => $now,
            'next_due_at' => $nextDue,
        ]);

        return $schedule->fresh();
    }

    /**
     * @return Collection<int, QcInspectionSchedule>
     */
    public function dueSchedules(?Carbon $asOf = null): Collection
    {
        $asOf ??= now();

        return QcInspectionSchedule::query()
            ->where('is_active', true)
            ->where('next_due_at', '<=', $asOf)
            ->get();
    }

    public function dispatchDueNotifications(?Carbon $asOf = null): int
    {
        $count = 0;

        foreach ($this->dueSchedules($asOf) as $schedule) {
            QcScheduleDue::dispatch(
                $schedule->id,
                $schedule->context instanceof QcInspectionContext
                    ? $schedule->context->value
                    : (string) $schedule->context,
                $schedule->next_due_at->toIso8601String(),
            );
            $count++;
        }

        return $count;
    }

    public function calculateNextDueAt(
        QcScheduleFrequency $frequency,
        int $interval,
        Carbon $from,
    ): Carbon {
        $interval = max(1, $interval);

        return match ($frequency) {
            QcScheduleFrequency::Daily => $from->copy()->addDays($interval),
            QcScheduleFrequency::Weekly => $from->copy()->addWeeks($interval),
            QcScheduleFrequency::Biweekly => $from->copy()->addWeeks(2 * $interval),
            QcScheduleFrequency::Monthly => $from->copy()->addMonths($interval),
            QcScheduleFrequency::Quarterly => $from->copy()->addMonths(3 * $interval),
        };
    }
}

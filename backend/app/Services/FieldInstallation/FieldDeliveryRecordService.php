<?php

namespace App\Services\FieldInstallation;

use App\Enums\FieldInstallation\DeliveryCondition;
use App\Enums\FieldInstallation\FieldJobType;
use App\Events\FieldInstallation\FieldDeliveryRecorded;
use App\Models\FieldInstallation\FieldDeliveryLine;
use App\Models\FieldInstallation\FieldDeliveryRecord;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\User;
use App\Services\Projects\ProjectDispatchService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FieldDeliveryRecordService
{
    public function __construct(
        protected FieldInstallationAuditLogger $audit,
        protected ProjectDispatchService $dispatches,
    ) {}

    public function record(FieldInstallationJob $job, User $actor, array $data): FieldDeliveryRecord
    {
        if ($job->job_type === FieldJobType::OutsideFullInstall && $job->deliveryRecords()->doesntExist()) {
            // first delivery for outside install is expected
        }

        $condition = DeliveryCondition::from($data['delivery_condition']);

        if (in_array($condition, [DeliveryCondition::Partial, DeliveryCondition::Rejected], true)) {
            $hasNc = ! empty($data['non_conformity_id']) || ! empty($data['skip_nc_check']);
            if (! $hasNc && empty($data['lines'])) {
                throw ValidationException::withMessages([
                    'delivery_condition' => ['Partial or rejected deliveries require non-conformity documentation or delivery lines.'],
                ]);
            }
        }

        return DB::transaction(function () use ($job, $actor, $data, $condition) {
            $record = FieldDeliveryRecord::query()->create([
                'job_id' => $job->id,
                'project_id' => $job->project_id,
                'transport_order_id' => $data['transport_order_id'] ?? null,
                'received_by' => $actor->id,
                'received_at' => $data['received_at'] ?? now(),
                'delivery_condition' => $condition,
                'vehicle_reg' => $data['vehicle_reg'] ?? null,
                'driver_name' => $data['driver_name'] ?? null,
                'packing_list_ref' => $data['packing_list_ref'] ?? null,
                'expected_units' => $data['expected_units'] ?? null,
                'received_units' => $data['received_units'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['lines'] ?? [] as $line) {
                FieldDeliveryLine::query()->create([
                    'delivery_record_id' => $record->id,
                    'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                    'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                    'description' => $line['description'],
                    'qty_expected' => $line['qty_expected'],
                    'qty_received' => $line['qty_received'],
                    'unit' => $line['unit'] ?? 'each',
                    'condition_notes' => $line['condition_notes'] ?? null,
                    'created_at' => now(),
                ]);
            }

            if ($condition === DeliveryCondition::Partial) {
                $this->assertQtyMismatchDocumented($record, $data);
            }

            if ($condition === DeliveryCondition::Complete && $job->project) {
                $this->dispatches->completeOpenDispatchesForProject($job->project);
            }

            event(new FieldDeliveryRecorded(
                jobId: $job->id,
                projectId: $job->project_id,
                deliveryRecordId: $record->id,
                receivedByUserId: $actor->id,
            ));

            $this->audit->log('field.delivery_recorded', $record, newValues: [
                'delivery_condition' => $condition->value,
            ]);

            return $record->fresh(['lines', 'receiver']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(FieldDeliveryRecord $record, array $data): FieldDeliveryRecord
    {
        return DB::transaction(function () use ($record, $data) {
            $header = collect($data)->except('lines')->all();
            if ($header !== []) {
                $record->update($header);
            }

            if (array_key_exists('lines', $data)) {
                $record->lines()->delete();
                foreach ($data['lines'] ?? [] as $line) {
                    FieldDeliveryLine::query()->create([
                        'delivery_record_id' => $record->id,
                        'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                        'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                        'description' => $line['description'],
                        'qty_expected' => $line['qty_expected'],
                        'qty_received' => $line['qty_received'],
                        'unit' => $line['unit'] ?? 'each',
                        'condition_notes' => $line['condition_notes'] ?? null,
                        'created_at' => now(),
                    ]);
                }
            }

            $this->audit->log('field.delivery_updated', $record, newValues: $data);

            return $record->fresh(['lines', 'receiver']);
        });
    }

    protected function assertQtyMismatchDocumented(FieldDeliveryRecord $record, array $data): void
    {
        $hasShortage = false;
        foreach ($data['lines'] ?? [] as $line) {
            $expected = (string) ($line['qty_expected'] ?? '0');
            $received = (string) ($line['qty_received'] ?? '0');
            if (bccomp($received, $expected, 3) === -1) {
                $hasShortage = true;
                break;
            }
        }

        if ($hasShortage && empty($data['acknowledge_partial_without_nc'])) {
            throw ValidationException::withMessages([
                'lines' => ['Partial delivery with quantity shortfalls requires a non-conformity or explicit acknowledgement.'],
            ]);
        }
    }
}

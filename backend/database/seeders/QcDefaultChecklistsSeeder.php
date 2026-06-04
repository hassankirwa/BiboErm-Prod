<?php

namespace Database\Seeders;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcScheduleFrequency;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\QualityControl\QcInspectionSchedule;
use App\Models\User;
use Illuminate\Database\Seeder;

class QcDefaultChecklistsSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'GRN Incoming Quality',
                'context' => QcInspectionContext::WarehouseReceiving,
                'items' => [
                    ['key' => 'packaging_intact', 'label' => 'Packaging intact — no water or impact damage', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'qty_matches_po', 'label' => 'Quantity matches PO line within tolerance', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'profile_visual', 'label' => 'Aluminium: no bending, scratching, or incorrect alloy mark', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'accessory_labelling', 'label' => 'Accessories: correct SKU labels on bins/packs', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'rubber_batch', 'label' => 'Rubbers: batch/date visible and matches PO', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'docs_with_shipment', 'label' => 'Delivery note and invoice copy present', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                ],
            ],
            [
                'name' => 'Weekly accessories order',
                'context' => QcInspectionContext::WarehouseAccessoriesAudit,
                'items' => [
                    ['key' => 'bins_labelled', 'label' => 'Every bin has readable label matching system', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'door_type_separation', 'label' => 'Sliding / folding / casement / bathroom sections not mixed', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'fifo_visible', 'label' => 'Older stock forward; no buried bins', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'floor_clear', 'label' => 'Aisle clear; no boxes on floor', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'min_max_marked', 'label' => 'Low-stock bins flagged', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                ],
            ],
            [
                'name' => 'Biweekly aluminium order',
                'context' => QcInspectionContext::WarehouseAluminiumAudit,
                'items' => [
                    ['key' => 'profile_family_grouped', 'label' => 'Profiles grouped by family in correct subsection', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'length_stored_safe', 'label' => 'Bars stored without tip damage', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'offcuts_area', 'label' => 'Offcuts/production workspace offcuts labelled (if applicable)', 'type' => 'pass_fail', 'required' => false, 'sort_order' => 30],
                ],
            ],
            [
                'name' => 'Monthly rubbers corner',
                'context' => QcInspectionContext::WarehouseRubbersAudit,
                'items' => [
                    ['key' => 'compatibility_grouped', 'label' => 'Gaskets grouped by compatible profile', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'sealed_storage', 'label' => 'Rolls/bags sealed where required', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                ],
            ],
            [
                'name' => 'Monthly tool condition',
                'context' => QcInspectionContext::ToolsPeriodic,
                'items' => [
                    ['key' => 'physical_condition', 'label' => 'No cracked handles, frayed cords, missing guards', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'calibration_current', 'label' => 'Calibration sticker in date (if applicable)', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'return_status', 'label' => 'Issued tools accounted for or overdue flagged', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                ],
            ],
            [
                'name' => 'Pre-cutting materials',
                'context' => QcInspectionContext::ProductionQcPreCheck,
                'items' => [
                    ['key' => 'bom_match', 'label' => 'Materials match approved BOM for project', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'profile_length', 'label' => 'Profile lengths sufficient for cutting sheet', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'accessory_kit', 'label' => 'Pre-kit accessories present for door types', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'glass_not_required_yet', 'label' => 'Glass not required at this stage (procurement only)', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                ],
            ],
            [
                'name' => 'Post-fabrication',
                'context' => QcInspectionContext::ProductionQcPostFabrication,
                'items' => [
                    ['key' => 'dimensions_within_tolerance', 'label' => 'Frame dimensions within ± tolerance', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'squareness', 'label' => 'Diagonal check pass', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'surface_finish', 'label' => 'No unacceptable scratches or dents', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'hardware_fit', 'label' => 'Hinges/handles/locks operate correctly', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'glass_bead_ready', 'label' => 'Glass rebate clean — ready for glass install', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'labels_applied', 'label' => 'Project/unit label applied', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                ],
            ],
            [
                'name' => 'Site QC',
                'context' => QcInspectionContext::SiteInstallation,
                'items' => [
                    ['key' => 'plumb_level', 'label' => 'Unit plumb and level', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'sealing_complete', 'label' => 'Seals and gaskets fitted', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'operation_smooth', 'label' => 'Opens/closes smoothly', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'glass_undamaged', 'label' => 'Glass intact — no chips', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'site_cleaned', 'label' => 'Work area cleaned', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'client_walkthrough', 'label' => 'Client walkthrough completed', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                ],
            ],
            [
                'name' => 'Snagging resolved',
                'context' => QcInspectionContext::SnaggingSignoff,
                'items' => [
                    ['key' => 'all_snags_closed', 'label' => 'All logged snag items resolved', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'rework_photographed', 'label' => 'Rework photographed', 'type' => 'photo_required_on_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'client_signoff', 'label' => 'Client sign-off obtained', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                ],
            ],
        ];

        foreach ($templates as $row) {
            QcChecklistTemplate::query()->updateOrCreate(
                [
                    'name' => $row['name'],
                    'context' => $row['context'],
                    'project_id' => null,
                    'is_system' => true,
                ],
                [
                    'stage' => $row['context']->value,
                    'items' => $row['items'],
                    'is_active' => true,
                    'version' => 1,
                ],
            );
        }

        $creator = User::query()->first();
        if (! $creator) {
            return;
        }

        $schedules = [
            ['name' => 'Accessories weekly audit', 'context' => QcInspectionContext::WarehouseAccessoriesAudit, 'frequency' => QcScheduleFrequency::Weekly],
            ['name' => 'Aluminium biweekly audit', 'context' => QcInspectionContext::WarehouseAluminiumAudit, 'frequency' => QcScheduleFrequency::Biweekly],
            ['name' => 'Rubbers monthly audit', 'context' => QcInspectionContext::WarehouseRubbersAudit, 'frequency' => QcScheduleFrequency::Monthly],
            ['name' => 'Tools monthly inspection', 'context' => QcInspectionContext::ToolsPeriodic, 'frequency' => QcScheduleFrequency::Monthly],
        ];

        $scheduleService = app(\App\Services\QualityControl\QcScheduleService::class);

        foreach ($schedules as $row) {
            QcInspectionSchedule::query()->updateOrCreate(
                ['name' => $row['name']],
                [
                    'context' => $row['context'],
                    'frequency' => $row['frequency'],
                    'frequency_interval' => 1,
                    'next_due_at' => $scheduleService->calculateNextDueAt($row['frequency'], 1, now()),
                    'is_active' => true,
                    'created_by' => $creator->id,
                ],
            );
        }
    }
}

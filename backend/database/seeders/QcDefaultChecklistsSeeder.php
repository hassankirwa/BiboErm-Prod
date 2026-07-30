<?php

namespace Database\Seeders;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Enums\QualityControl\QcScheduleFrequency;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionSchedule;
use App\Models\User;
use Illuminate\Database\Seeder;

class QcDefaultChecklistsSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'GRN Receiving',
                'context' => QcInspectionContext::WarehouseReceiving,
                'description' => 'Goods receipt checks for aluminium profiles, accessories, balustrade, tubes/louvers/shower/net, and Premium/Standard tiers.',
                'items' => [
                    [
                        'key' => 'docs_delivery_packing_list',
                        'label' => 'Delivery note and packing list present and legible',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Match GRN reference to supplier DN / packing list before counting stock.',
                        'sort_order' => 10,
                    ],
                    [
                        'key' => 'qty_matches_po_grn',
                        'label' => 'Received quantity matches PO / GRN / packing list',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Count bars, packs, or kits per line. Flag short-ships and over-receipts.',
                        'sort_order' => 20,
                    ],
                    [
                        'key' => 'sku_profile_identity',
                        'label' => 'Correct material identity (SKU / catalog code / profile)',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Verify labels against PO lines — profile number, accessory code, tube/louver/shower/net SKU.',
                        'sort_order' => 30,
                    ],
                    [
                        'key' => 'dimensions_length_profile',
                        'label' => 'Dimensions / length / profile section match PO (where applicable)',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Check bar length, profile family, tube OD, louver size. Use N/A for sealed accessory packs with no measurable length.',
                        'sort_order' => 40,
                    ],
                    [
                        'key' => 'finish_color_coating_tier',
                        'label' => 'Surface finish / colour / coating / tier matches PO',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Confirm powder coat / anodise colour and Premium vs Standard tier where specified.',
                        'sort_order' => 50,
                    ],
                    [
                        'key' => 'visible_damage',
                        'label' => 'No unacceptable dents, scratches, bends, or tip damage',
                        'type' => 'photo_required_on_fail',
                        'required' => true,
                        'help_text' => 'Inspect profiles, balustrade rails, tubes, and packed surfaces. Photograph damage before putaway.',
                        'sort_order' => 60,
                    ],
                    [
                        'key' => 'packing_condition',
                        'label' => 'Packaging intact — no water, crush, or transit damage',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Check wraps, end caps, crates, and cartons before opening stock.',
                        'sort_order' => 70,
                    ],
                    [
                        'key' => 'accessories_completeness',
                        'label' => 'Accessories / hardware kits complete vs packing list',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Hinges, locks, handles, rollers, brackets, fasteners. Use N/A if GRN has no accessory lines.',
                        'sort_order' => 80,
                    ],
                    [
                        'key' => 'rubber_gasket_labelling',
                        'label' => 'Rubbers / gaskets labelled with batch and compatible profile (if applicable)',
                        'type' => 'pass_fail',
                        'required' => false,
                        'help_text' => 'Optional when rubber lines are on the GRN.',
                        'sort_order' => 90,
                    ],
                    [
                        'key' => 'putaway_ready_labelling',
                        'label' => 'Items labelled and ready for catalog putaway bins',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Readable SKU/bin labels so warehouse can put away to the correct section.',
                        'sort_order' => 100,
                    ],
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
                'name' => 'Pre-cutting materials QC',
                'context' => QcInspectionContext::ProductionQcPreCheck,
                'description' => 'Verify released materials against BOM and cutting sheet before cutting starts.',
                'items' => [
                    [
                        'key' => 'bom_match',
                        'label' => 'Materials match approved / finalized BOM for this project',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Cross-check SKUs, colours, and quantities against the released BOM.',
                        'sort_order' => 10,
                    ],
                    [
                        'key' => 'reservation_released',
                        'label' => 'Warehouse release / staged materials present and labelled for this order',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Confirm pickup matches production order reference and FIFO release.',
                        'sort_order' => 20,
                    ],
                    [
                        'key' => 'profile_length',
                        'label' => 'Aluminium bar lengths sufficient for cutting sheet demand',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Bars / usable offcuts cover planned cuts without unsafe stitching.',
                        'sort_order' => 30,
                    ],
                    [
                        'key' => 'profile_identity_finish',
                        'label' => 'Correct profile family, section, and surface finish / colour',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 40,
                    ],
                    [
                        'key' => 'accessory_kit',
                        'label' => 'Hardware / accessory kits present for door types on the job',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Hinges, locks, handles, rollers, brackets as per BOM.',
                        'sort_order' => 50,
                    ],
                    [
                        'key' => 'rubber_gaskets',
                        'label' => 'Rubbers / gaskets present and compatible with profiles (if on BOM)',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Use N/A only when BOM has no rubber lines.',
                        'sort_order' => 60,
                    ],
                    [
                        'key' => 'cutting_sheet_ready',
                        'label' => 'Cutting sheet generated and lengths readable for operators',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 70,
                    ],
                    [
                        'key' => 'damage_check',
                        'label' => 'No unacceptable dents, bends, tip damage, or wet stock',
                        'type' => 'photo_required_on_fail',
                        'required' => true,
                        'sort_order' => 80,
                    ],
                    [
                        'key' => 'glass_not_required_yet',
                        'label' => 'Glass not required at this stage (procure / track separately)',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Confirm glass is not blocking cutting; note glass order status if known.',
                        'sort_order' => 90,
                    ],
                ],
            ],
            [
                'name' => 'Cutting QC',
                'context' => QcInspectionContext::ProductionInProcess,
                'stage' => 'cutting',
                'description' => 'In-process checks after / during aluminium cutting.',
                'items' => [
                    ['key' => 'cut_length_tolerance', 'label' => 'Cut lengths within tolerance vs cutting sheet', 'type' => 'pass_fail', 'required' => true, 'help_text' => 'Spot-check critical openings and longest bars.', 'sort_order' => 10],
                    ['key' => 'cut_angle_square', 'label' => 'Cut ends square / correct mitre angle', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'burrs_deburr', 'label' => 'Burrs removed; ends safe for assembly', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'profile_damage_after_cut', 'label' => 'No crush, scratch, or tip damage from saw / handling', 'type' => 'photo_required_on_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'pieces_labelled', 'label' => 'Cut pieces labelled by opening / project', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'offcuts_logged', 'label' => 'Reusable offcuts logged or scrap segregated', 'type' => 'pass_fail', 'required' => true, 'help_text' => 'Usable remnants returned to production workspace / WH process.', 'sort_order' => 60],
                    ['key' => 'qty_vs_sheet', 'label' => 'Piece count matches cutting sheet', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 70],
                ],
            ],
            [
                'name' => 'Fabrication QC',
                'context' => QcInspectionContext::ProductionInProcess,
                'stage' => 'fabrication',
                'description' => 'Frame fabrication / welding / joining checks.',
                'items' => [
                    ['key' => 'join_alignment', 'label' => 'Joints aligned — no step or twist at corners', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'weld_crimp_quality', 'label' => 'Welds / crimps / connectors secure and clean', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'frame_dimensions', 'label' => 'Overall frame width / height within tolerance', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'diagonal_square', 'label' => 'Diagonal / squareness check pass', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'machining_slots', 'label' => 'Drainage / hardware slots correct location and clean', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'surface_finish_fab', 'label' => 'No unacceptable scratches, burns, or coating damage', 'type' => 'photo_required_on_fail', 'required' => true, 'sort_order' => 60],
                    ['key' => 'unit_id_label', 'label' => 'Opening / unit identity marked for next stage', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 70],
                ],
            ],
            [
                'name' => 'Sash fabrication QC',
                'context' => QcInspectionContext::ProductionInProcess,
                'stage' => 'sash',
                'description' => 'Sash / leaf fabrication and fit checks.',
                'items' => [
                    ['key' => 'sash_dimensions', 'label' => 'Sash dimensions match frame / drawing', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'sash_square', 'label' => 'Sash diagonals within tolerance', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'hardware_prep', 'label' => 'Hinge / lock / roller prep positions correct', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'sash_operation_dry', 'label' => 'Dry fit in frame — free movement, even gaps', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'sash_finish', 'label' => 'Sash finish free of dents and deep scratches', 'type' => 'photo_required_on_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'sash_labelled', 'label' => 'Sash labelled to matching frame / opening', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                ],
            ],
            [
                'name' => 'Glass assembly QC',
                'context' => QcInspectionContext::ProductionInProcess,
                'stage' => 'glass_assembly',
                'description' => 'Glazing and bead checks (skip if no glass on project).',
                'items' => [
                    ['key' => 'glass_spec_match', 'label' => 'Glass type / thickness / tint matches order', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'glass_undamaged', 'label' => 'Glass free of chips, cracks, and scratches', 'type' => 'photo_required_on_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'setting_blocks', 'label' => 'Setting blocks / packers correctly placed', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'bead_fit', 'label' => 'Beads seated fully; no gaps or forced fit', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'rebate_clean', 'label' => 'Rebate clean before glazing', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'seal_gasket_glass', 'label' => 'Glazing gasket / seal continuous where required', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                ],
            ],
            [
                'name' => 'Finishing QC',
                'context' => QcInspectionContext::ProductionInProcess,
                'stage' => 'finishing',
                'description' => 'Final assembly, hardware, and finish before post-fabrication QC.',
                'items' => [
                    ['key' => 'hardware_fitted', 'label' => 'All specified hardware fitted and secure', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'operation_smooth', 'label' => 'Opens / closes / locks smoothly', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'gaskets_fitted', 'label' => 'Weather / compression gaskets fully fitted', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
                    ['key' => 'clearances', 'label' => 'Operating clearances even around sash', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 40],
                    ['key' => 'protective_film', 'label' => 'Protective film / packing applied for transit', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 50],
                    ['key' => 'finish_clean', 'label' => 'Unit cleaned — no swarf, silicone smears, or labels residue', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 60],
                    ['key' => 'project_label', 'label' => 'Project / unit label applied and readable', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 70],
                ],
            ],
            [
                'name' => 'Post-fabrication QC',
                'context' => QcInspectionContext::ProductionQcPostFabrication,
                'description' => 'Final gate before QC pre-installation / dispatch.',
                'items' => [
                    [
                        'key' => 'dimensions_within_tolerance',
                        'label' => 'Frame / unit dimensions within ± tolerance vs drawing',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 10,
                    ],
                    [
                        'key' => 'squareness',
                        'label' => 'Diagonal / squareness check pass',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 20,
                    ],
                    [
                        'key' => 'surface_finish',
                        'label' => 'No unacceptable scratches, dents, or coating damage',
                        'type' => 'photo_required_on_fail',
                        'required' => true,
                        'sort_order' => 30,
                    ],
                    [
                        'key' => 'hardware_fit',
                        'label' => 'Hinges / handles / locks / rollers operate correctly',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 40,
                    ],
                    [
                        'key' => 'glass_bead_ready',
                        'label' => 'Glazing complete or rebate ready — no loose beads',
                        'type' => 'pass_fail',
                        'required' => true,
                        'help_text' => 'Use N/A only if project has no glass and stage was skipped.',
                        'sort_order' => 50,
                    ],
                    [
                        'key' => 'seals_complete',
                        'label' => 'Seals and gaskets continuous; no gaps at corners',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 60,
                    ],
                    [
                        'key' => 'drainage_weep',
                        'label' => 'Drainage / weep paths clear (if applicable)',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 70,
                    ],
                    [
                        'key' => 'labels_applied',
                        'label' => 'Project / unit / orientation labels applied',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 80,
                    ],
                    [
                        'key' => 'pack_ready',
                        'label' => 'Unit packed / protected for storage or dispatch',
                        'type' => 'pass_fail',
                        'required' => true,
                        'sort_order' => 90,
                    ],
                ],
            ],
            [
                'name' => 'Site receiving',
                'context' => QcInspectionContext::SiteReceiving,
                'items' => [
                    ['key' => 'glass_undamaged', 'label' => 'Glass undamaged — no chips or cracks', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 10],
                    ['key' => 'count_match', 'label' => 'Received count matches packing list', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 20],
                    ['key' => 'packing_intact', 'label' => 'Packing intact — no transit damage', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 30],
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
            $this->upsertSystemTemplate($row);
        }

        $this->deactivateOrphanInProcessTemplates();

        $this->backfillPendingInspectionsWithoutTemplate();

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

    /**
     * @param  array{name: string, context: QcInspectionContext, items: list<array<string, mixed>>, description?: string, stage?: string}  $row
     */
    protected function upsertSystemTemplate(array $row): QcChecklistTemplate
    {
        $stage = $row['stage'] ?? $row['context']->value;

        $existing = QcChecklistTemplate::query()
            ->where('context', $row['context'])
            ->where('stage', $stage)
            ->whereNull('project_id')
            ->where('is_system', true)
            ->orderByDesc('version')
            ->first();

        // Legacy rows keyed only by context (stage may have matched context value loosely).
        if (! $existing && ! isset($row['stage'])) {
            $existing = QcChecklistTemplate::query()
                ->where('context', $row['context'])
                ->whereNull('project_id')
                ->where('is_system', true)
                ->orderByDesc('version')
                ->first();
        }

        $attributes = [
            'name' => $row['name'],
            'context' => $row['context'],
            'stage' => $stage,
            'description' => $row['description'] ?? null,
            'items' => $row['items'],
            'is_active' => true,
            'is_system' => true,
            'project_id' => null,
            'version' => max(1, (int) ($existing?->version ?? 0) + ($existing ? 1 : 0)),
        ];

        if ($existing) {
            // Keep version bump only when checklist content changes so re-seeds stay idempotent.
            $itemsChanged = $existing->items !== $row['items']
                || $existing->name !== $row['name']
                || ($existing->description ?? null) !== ($row['description'] ?? null)
                || ($existing->stage ?? null) !== $stage;

            $existing->fill([
                'name' => $row['name'],
                'stage' => $stage,
                'description' => $row['description'] ?? null,
                'items' => $row['items'],
                'is_active' => true,
                'version' => $itemsChanged ? ((int) $existing->version + 1) : max(1, (int) $existing->version),
            ]);
            $existing->save();

            // Deactivate legacy duplicates for the same system context+stage.
            QcChecklistTemplate::query()
                ->where('context', $row['context'])
                ->where('stage', $stage)
                ->whereNull('project_id')
                ->where('is_system', true)
                ->where('id', '!=', $existing->id)
                ->update(['is_active' => false]);

            return $existing->fresh();
        }

        return QcChecklistTemplate::query()->create($attributes);
    }

    /**
     * Older seeds forced stage = context, collapsing in-process templates.
     * Deactivate leftovers that are not one of the known production sub-stages.
     */
    protected function deactivateOrphanInProcessTemplates(): void
    {
        $keepStages = ['cutting', 'fabrication', 'sash', 'glass_assembly', 'finishing'];

        QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionInProcess)
            ->whereNull('project_id')
            ->where('is_system', true)
            ->where(function ($query) use ($keepStages) {
                $query->whereNull('stage')
                    ->orWhereNotIn('stage', $keepStages);
            })
            ->update(['is_active' => false]);
    }

    protected function backfillPendingInspectionsWithoutTemplate(): void
    {
        $pending = QcInspection::query()
            ->whereNull('template_id')
            ->where('result', QcInspectionResult::Pending)
            ->get(['id', 'context', 'project_id']);

        if ($pending->isEmpty()) {
            return;
        }

        /** @var \App\Services\QualityControl\QcTemplateResolverService $resolver */
        $resolver = app(\App\Services\QualityControl\QcTemplateResolverService::class);

        foreach ($pending as $inspection) {
            $context = $inspection->context instanceof QcInspectionContext
                ? $inspection->context
                : QcInspectionContext::tryFrom((string) $inspection->context);

            if (! $context) {
                continue;
            }

            $template = $resolver->resolve(
                $context,
                $inspection->project_id,
                is_string($inspection->stage) ? $inspection->stage : null,
            );
            if ($template) {
                $inspection->update(['template_id' => $template->id]);
            }
        }
    }
}

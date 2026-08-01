<?php

namespace Tests\Feature\FieldInstallation;

use App\Enums\FieldInstallation\DeliveryCondition;
use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\FieldJobType;
use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Enums\InstallMode;
use App\Enums\ProjectStage;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\Project;
use App\Models\QualityControl\QcInspection;
use App\Models\User;
use App\Services\FieldInstallation\FieldDeliveryRecordService;
use App\Services\FieldInstallation\FieldInstallationJobService;
use Database\Seeders\QcDefaultChecklistsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class FieldInstallationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Permission::findOrCreate('field_installation.manage');
        Permission::findOrCreate('field_installation.log');
        Permission::findOrCreate('field_installation.deliver');

        $this->actor = User::factory()->create();
        $this->actor->givePermissionTo([
            'field_installation.manage',
            'field_installation.log',
            'field_installation.deliver',
        ]);

        $this->seed(QcDefaultChecklistsSeeder::class);
    }

    public function test_completing_field_job_creates_site_installation_qc(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-FI-QC-'.uniqid(),
            'name' => 'Field Complete QC',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'product_type' => 'Door',
                            'quantity' => 1,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
            'actual_start' => now()->subDay(),
            'percent_complete' => 100,
        ]);

        FieldInstallationUnit::query()->create([
            'job_id' => $job->id,
            'unit_label' => 'Ground — D01',
            'opening_ref' => 'D01',
            'status' => FieldUnitStatus::Installed,
            'sort_order' => 0,
            'measurement_line_key' => 'line-0-D01',
            'installed_at' => now(),
            'installed_by' => $this->actor->id,
        ]);

        app(FieldInstallationJobService::class)->complete($job, $this->actor);

        $inspection = QcInspection::query()
            ->where('project_id', $project->id)
            ->where('field_installation_job_id', $job->id)
            ->where('context', QcInspectionContext::SiteInstallation)
            ->first();

        $this->assertNotNull($inspection);
        $this->assertSame(QcInspectionResult::Pending, $inspection->result);
        $this->assertNotNull($inspection->template_id);
    }

    public function test_recording_delivery_creates_site_receiving_inspection(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-FI-RCV-'.uniqid(),
            'name' => 'Field Delivery Receiving QC',
            'stage' => ProjectStage::InTransit,
            'type' => 'residential',
            'location_type' => 'outside_nairobi',
            'install_mode' => InstallMode::OutsideFullInstall,
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-RCV-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::OutsideFullInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        $record = app(FieldDeliveryRecordService::class)->record($job, $this->actor, [
            'delivery_condition' => DeliveryCondition::Complete->value,
            'expected_units' => 2,
            'received_units' => 2,
            'lines' => [
                [
                    'description' => 'Sliding door sash',
                    'qty_expected' => '2',
                    'qty_received' => '2',
                    'unit' => 'each',
                ],
            ],
        ]);

        $inspection = QcInspection::query()
            ->where('project_id', $project->id)
            ->where('field_installation_job_id', $job->id)
            ->where('context', QcInspectionContext::SiteReceiving)
            ->first();

        $this->assertNotNull($inspection);
        $this->assertSame(QcInspectionResult::Pending, $inspection->result);
        $this->assertNotNull($inspection->template_id);
        $this->assertStringContainsString((string) $record->id, (string) $inspection->notes);

        $this->assertSame(
            ProjectStage::Installation,
            app(\App\Services\Projects\ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    public function test_second_delivery_does_not_duplicate_site_receiving_qc(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-FI-RCV2-'.uniqid(),
            'name' => 'Field Delivery Receiving QC Idempotent',
            'stage' => ProjectStage::InTransit,
            'type' => 'residential',
            'location_type' => 'outside_nairobi',
            'install_mode' => InstallMode::OutsideFullInstall,
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-RCV2-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::OutsideFullInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        $service = app(FieldDeliveryRecordService::class);
        $payload = [
            'delivery_condition' => DeliveryCondition::Complete->value,
            'expected_units' => 1,
            'received_units' => 1,
            'lines' => [
                [
                    'description' => 'Door leaf',
                    'qty_expected' => '1',
                    'qty_received' => '1',
                    'unit' => 'each',
                ],
            ],
        ];

        $first = $service->record($job, $this->actor, $payload);
        $second = $service->record($job, $this->actor, $payload);

        $inspections = QcInspection::query()
            ->where('field_installation_job_id', $job->id)
            ->where('context', QcInspectionContext::SiteReceiving)
            ->get();

        $this->assertCount(1, $inspections);
        $this->assertStringContainsString((string) $first->id, (string) $inspections->first()->notes);
        $this->assertStringContainsString((string) $second->id, (string) $inspections->first()->notes);
    }

    public function test_completing_field_job_twice_does_not_duplicate_site_installation_qc(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-FI-QC2-'.uniqid(),
            'name' => 'Field Complete QC Idempotent',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'product_type' => 'Door',
                            'quantity' => 1,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI2-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
            'actual_start' => now()->subDay(),
            'percent_complete' => 100,
        ]);

        FieldInstallationUnit::query()->create([
            'job_id' => $job->id,
            'unit_label' => 'Ground — D01',
            'opening_ref' => 'D01',
            'status' => FieldUnitStatus::Installed,
            'sort_order' => 0,
            'measurement_line_key' => 'line-0-D01',
            'installed_at' => now(),
            'installed_by' => $this->actor->id,
        ]);

        $service = app(FieldInstallationJobService::class);
        $service->complete($job, $this->actor);
        $service->complete($job->fresh(), $this->actor);

        $this->assertSame(
            1,
            QcInspection::query()
                ->where('field_installation_job_id', $job->id)
                ->where('context', QcInspectionContext::SiteInstallation)
                ->count(),
        );
    }
}

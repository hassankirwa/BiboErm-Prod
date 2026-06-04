<?php

namespace Tests\Unit\Support;

use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\ProjectDocument;
use App\Support\ProjectStageGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectStageGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_detects_design_documents_and_bom_readiness(): void
    {
        $project = Project::query()->create([
            'reference' => 'PR-'.strtoupper(Str::random(8)),
            'name' => 'Gate Test',
            'stage' => 'final_design_approval',
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ]);

        $this->assertFalse(ProjectStageGate::hasDesignDocument($project));
        $this->assertFalse(ProjectStageGate::hasBomUploaded($project));
        $this->assertFalse(ProjectStageGate::hasBomFinalized($project));

        ProjectDocument::query()->create([
            'project_id' => $project->id,
            'type' => 'design',
            'filename' => 'plan.pdf',
            'path' => 'project-documents/test.pdf',
            'version' => 1,
            'uploaded_by' => null,
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'draft',
            'uploaded_by' => null,
        ]);

        ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'material_name' => 'Handle',
            'quantity' => 2,
            'sort_order' => 0,
        ]);

        $project->load(['documents', 'latestBom.lines']);

        $this->assertTrue(ProjectStageGate::hasDesignDocument($project));
        $this->assertTrue(ProjectStageGate::hasBomUploaded($project));
        $this->assertFalse(ProjectStageGate::hasBomFinalized($project));

        $bom->forceFill(['status' => 'finalized', 'finalized_at' => now()])->save();
        $project->unsetRelation('latestBom');
        $project->load('latestBom.lines');

        $readiness = ProjectStageGate::readiness($project);

        $this->assertTrue($readiness['has_design_document']);
        $this->assertTrue($readiness['has_bom_uploaded']);
        $this->assertTrue($readiness['has_bom_finalized']);
    }
}

<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ProjectDesignService
{
    /** @var list<string> */
    public const DESIGN_QUEUE_STAGES = [
        ProjectStage::DepositReceived->value,
        ProjectStage::SiteAssessment->value,
        ProjectStage::FinalDesignApproval->value,
    ];

    /**
     * Active projects in the design phase (deposit received through final design approval).
     *
     * @return Collection<int, Project>
     */
    public function listDesignQueue(User $user): Collection
    {
        return Project::query()
            ->visibleTo($user)
            ->where('is_active', true)
            ->whereIn('stage', self::DESIGN_QUEUE_STAGES)
            ->with(['projectManager', 'account', 'documents'])
            ->orderByDesc('updated_at')
            ->get();
    }
}

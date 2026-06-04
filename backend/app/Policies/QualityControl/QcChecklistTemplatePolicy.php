<?php

namespace App\Policies\QualityControl;

use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\User;

class QcChecklistTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('qc.view');
    }

    public function view(User $user, QcChecklistTemplate $template): bool
    {
        return $user->can('qc.view');
    }

    public function create(User $user): bool
    {
        return $user->can('qc.templates.manage') || $user->can('qc.manage');
    }

    public function update(User $user, QcChecklistTemplate $template): bool
    {
        return ($user->can('qc.templates.manage') || $user->can('qc.manage')) && ! $template->is_system;
    }

    public function clone(User $user, QcChecklistTemplate $template): bool
    {
        return $user->can('qc.templates.manage') || $user->can('qc.manage');
    }
}

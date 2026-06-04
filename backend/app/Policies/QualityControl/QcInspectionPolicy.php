<?php

namespace App\Policies\QualityControl;

use App\Models\QualityControl\QcInspection;
use App\Models\User;

class QcInspectionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('qc.view');
    }

    public function view(User $user, QcInspection $inspection): bool
    {
        return $user->can('qc.view');
    }

    public function create(User $user): bool
    {
        return $user->can('qc.inspect');
    }

    public function update(User $user, QcInspection $inspection): bool
    {
        return $user->can('qc.inspect');
    }

    public function submit(User $user, QcInspection $inspection): bool
    {
        return $user->can('qc.inspect');
    }

    public function uploadPhoto(User $user, QcInspection $inspection): bool
    {
        return $user->can('qc.inspect');
    }

    public function addDefect(User $user, QcInspection $inspection): bool
    {
        return $user->can('qc.inspect');
    }
}

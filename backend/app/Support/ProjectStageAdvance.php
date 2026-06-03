<?php

namespace App\Support;

use App\Enums\ProjectStage;
use App\Models\User;

class ProjectStageAdvance
{
    /**
     * @return list<array{permission: string, from: list<string>, to: list<string>}>
     */
    public static function roles(): array
    {
        return config('bibo.pm.stage_advance', []);
    }

    /**
     * @return list<string>
     */
    public static function allowedTargetsFor(User $user, ProjectStage $fromStage): array
    {
        $from = $fromStage->value;
        $targets = [];

        foreach (self::roles() as $role) {
            $permission = (string) ($role['permission'] ?? '');

            if ($permission !== '' && ! $user->can($permission) && ! $user->can('projects.manage') && ! $user->can('projects.view_all')) {
                continue;
            }

            foreach ($role['transitions'] ?? [] as $transition) {
                if (($transition['from'] ?? null) !== $from) {
                    continue;
                }

                foreach ($transition['to'] ?? [] as $target) {
                    $targets[] = (string) $target;
                }
            }
        }

        return array_values(array_unique($targets));
    }

    public static function userCanAdvanceTo(User $user, ProjectStage $fromStage, ProjectStage $toStage): bool
    {
        if ($user->can('projects.manage') || $user->can('projects.view_all')) {
            return true;
        }

        $from = $fromStage->value;
        $to = $toStage->value;

        foreach (self::roles() as $role) {
            $permission = (string) ($role['permission'] ?? '');

            if ($permission === '' || ! $user->can($permission)) {
                continue;
            }

            foreach ($role['transitions'] ?? [] as $transition) {
                if (($transition['from'] ?? null) !== $from) {
                    continue;
                }

                if (in_array($to, $transition['to'] ?? [], true)) {
                    return true;
                }
            }
        }

        return false;
    }
}

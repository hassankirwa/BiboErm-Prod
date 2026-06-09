<?php

namespace App\Support\Crm;

class CrmActivityTypeGroups
{
    /** @var array<string, list<string>> */
    public const GROUPS = [
        'call' => ['call', 'schedule_call', 'call_log'],
        'meeting' => ['meeting', 'meeting_note', 'schedule_meeting'],
        'email' => ['email', 'email_sent'],
        'task' => ['task', 'create_task', 'follow_up'],
    ];

    /** @return list<string> */
    public static function allTypes(): array
    {
        $types = [];

        foreach (self::GROUPS as $groupTypes) {
            foreach ($groupTypes as $type) {
                $types[$type] = true;
            }
        }

        return array_keys($types);
    }

    /** @return list<string> */
    public static function resolveFilterTypes(string $filter): array
    {
        return self::GROUPS[$filter] ?? [$filter];
    }

    public static function normalizeCategory(string $type): string
    {
        $normalized = strtolower(trim($type));

        foreach (self::GROUPS as $category => $types) {
            if (in_array($normalized, $types, true)) {
                return $category;
            }
        }

        return $normalized;
    }
}

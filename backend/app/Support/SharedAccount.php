<?php

namespace App\Support;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;

final class SharedAccount
{
    public static function isShared(User $user): bool
    {
        $email = mb_strtolower(trim((string) $user->email));
        if ($email === '') {
            return false;
        }

        $local = self::localPart($email);
        if (str_contains($email, 'shared') || str_contains($local, 'shared')) {
            return true;
        }

        return Department::query()
            ->whereNotNull('shared_email')
            ->whereRaw('LOWER(shared_email) = ?', [$email])
            ->exists();
    }

    public static function resolveEmployeeUserId(?string $employeeNumber): ?int
    {
        $staffNo = strtoupper(trim((string) $employeeNumber));
        if ($staffNo === '') {
            return null;
        }

        return EmployeeProfile::query()
            ->whereRaw('UPPER(employee_number) = ?', [$staffNo])
            ->value('user_id');
    }

    private static function localPart(string $email): string
    {
        $pos = strpos($email, '@');

        return $pos === false ? $email : substr($email, 0, $pos);
    }
}

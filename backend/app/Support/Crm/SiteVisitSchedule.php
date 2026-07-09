<?php

namespace App\Support\Crm;

use App\Models\SiteVisit;
use Carbon\Carbon;

class SiteVisitSchedule
{
    public static function startsAt(SiteVisit $visit, string $defaultTime = '09:00:00'): Carbon
    {
        $date = $visit->visit_date
            ? Carbon::parse($visit->visit_date)->toDateString()
            : now()->toDateString();

        $time = self::normalizeTime($visit->visit_time, $defaultTime);

        return Carbon::parse("{$date} {$time}");
    }

    public static function normalizeTime(mixed $time, string $default = '09:00:00'): string
    {
        if ($time === null || $time === '') {
            return strlen($default) === 5 ? "{$default}:00" : $default;
        }

        if ($time instanceof \DateTimeInterface) {
            return Carbon::instance($time)->format('H:i:s');
        }

        $time = (string) $time;

        if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
            return "{$time}:00";
        }

        if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $time)) {
            return $time;
        }

        return strlen($default) === 5 ? "{$default}:00" : $default;
    }
}

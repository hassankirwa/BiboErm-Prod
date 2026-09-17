<?php

namespace App\Services\Hr;

use App\Models\EmployeeProfile;

final class EmployeeNumberGenerator
{
    public function suggest(?int $excludeUserId = null): string
    {
        $defaultPrefix = strtoupper((string) config('bibo.hr.employee_number_prefix', 'BWD'));
        $defaultPad = max(1, (int) config('bibo.hr.employee_number_pad', 4));
        $useHyphen = (bool) config('bibo.hr.employee_number_hyphen', false);

        $query = EmployeeProfile::query()->whereNotNull('employee_number');

        if ($excludeUserId !== null) {
            $query->where('user_id', '!=', $excludeUserId);
        }

        /** @var list<string> $numbers */
        $numbers = $query->pluck('employee_number')->all();

        $last = $this->resolveLatestNumber($numbers, $defaultPrefix);

        if ($last !== null) {
            return $this->formatNumber($last['prefix'], $last['sequence'] + 1, $last['pad'], $last['hyphen']);
        }

        return $this->formatNumber($defaultPrefix, 1, $defaultPad, $useHyphen);
    }

    /**
     * @param  list<string>  $numbers
     * @return array{prefix: string, sequence: int, pad: int, hyphen: bool}|null
     */
    private function resolveLatestNumber(array $numbers, string $preferredPrefix): ?array
    {
        $latestPreferred = null;
        $latestAny = null;

        foreach ($numbers as $number) {
            $parsed = $this->parseNumber($number);

            if ($parsed === null) {
                continue;
            }

            if ($latestAny === null || $parsed['sequence'] > $latestAny['sequence']) {
                $latestAny = $parsed;
            }

            if ($parsed['prefix'] === $preferredPrefix) {
                if ($latestPreferred === null || $parsed['sequence'] > $latestPreferred['sequence']) {
                    $latestPreferred = $parsed;
                }
            }
        }

        return $latestPreferred ?? $latestAny;
    }

    /**
     * @return array{prefix: string, sequence: int, pad: int, hyphen: bool}|null
     */
    private function parseNumber(string $number): ?array
    {
        $number = strtoupper(trim($number));

        if (preg_match('/^([A-Z]+)-(\d+)$/', $number, $matches)) {
            return [
                'prefix' => $matches[1],
                'sequence' => (int) $matches[2],
                'pad' => strlen($matches[2]),
                'hyphen' => true,
            ];
        }

        if (preg_match('/^([A-Z]+)(\d+)$/', $number, $matches)) {
            return [
                'prefix' => $matches[1],
                'sequence' => (int) $matches[2],
                'pad' => strlen($matches[2]),
                'hyphen' => false,
            ];
        }

        return null;
    }

    private function formatNumber(string $prefix, int $sequence, int $pad, bool $hyphen): string
    {
        $digits = sprintf('%0'.$pad.'d', $sequence);

        return $hyphen ? $prefix.'-'.$digits : $prefix.$digits;
    }
}

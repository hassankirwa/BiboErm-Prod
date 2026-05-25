<?php

namespace App\Support;

class JsonArray
{
    /**
     * @return list<string>
     */
    public static function normalize(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_array($value)) {
            return array_values(array_map('strval', $value));
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);

            if ($decoded !== null) {
                return self::normalize($decoded);
            }
        }

        return [];
    }
}

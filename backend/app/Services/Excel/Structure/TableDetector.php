<?php

namespace App\Services\Excel\Structure;

class TableDetector
{
    /** @var list<string> */
    protected const HEADER_LABELS = [
        'code', 'sku', 'name', 'description', 'details', 'picture', 'pictures',
        'length', 'total', 'tota', 'column1', 'no', 'n0', 'profile', 'remark',
    ];

    /**
     * @param  array<int, string|null>  $cells
     */
    public function looksLikeHeader(array $cells): bool
    {
        $normalized = array_filter(array_map(
            fn (?string $cell) => $cell === null ? null : mb_strtolower(rtrim($cell, '.')),
            $cells,
        ));

        return count(array_intersect($normalized, self::HEADER_LABELS)) >= 2;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @return array<string, int>
     */
    public function headerMap(array $cells): array
    {
        $map = [];
        foreach ($cells as $index => $cell) {
            if ($cell === null) {
                continue;
            }

            $key = mb_strtolower(rtrim($cell, '.'));
            $map[$key] = $index;

            if ($key === 'pictures') {
                $map['picture'] = $index;
            }
            if ($key === 'tota') {
                $map['total'] = $index;
            }
            if ($key === 'column1') {
                $map['total'] = $index;
            }
            if ($key === 'n0') {
                $map['no'] = $index;
            }
        }

        return $map;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @param  array<string, int>  $headerMap
     * @param  array<int, string>  $keys
     */
    public function valueAt(array $cells, array $headerMap, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (isset($headerMap[$key])) {
                return $cells[$headerMap[$key]] ?? null;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @param  array<string, int>  $headerMap
     * @return array{no: ?string, name: ?string, code: ?string, description: ?string, length: ?string, total: ?string}
     */
    public function rowValues(array $cells, array $headerMap): array
    {
        return [
            'no' => $this->valueAt($cells, $headerMap, ['no', 'no.', 'n0']),
            'name' => $this->valueAt($cells, $headerMap, ['name']),
            'code' => $this->valueAt($cells, $headerMap, ['code', 'sku', 'code.', 'profile']),
            'description' => $this->valueAt($cells, $headerMap, ['description', 'details', 'remark']),
            'length' => $this->valueAt($cells, $headerMap, ['length']),
            'total' => $this->valueAt($cells, $headerMap, ['total', 'tota', 'column1']),
        ];
    }

    public function tableHasDimensionColumn(array $headerMap): bool
    {
        return isset($headerMap['description']) || isset($headerMap['details']) || isset($headerMap['remark']);
    }
}

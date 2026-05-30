<?php

namespace App\Services\Procurement;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ProcurementReferenceGenerator
{
    public function requisition(): string
    {
        return $this->next('PR', 'purchase_requisitions', 'reference');
    }

    public function purchaseOrder(): string
    {
        return $this->next('PO', 'purchase_orders', 'reference');
    }

    public function grn(): string
    {
        return $this->next('GRN', 'goods_receipts', 'grn_number');
    }

    public function transport(): string
    {
        return $this->next('TR', 'transport_orders', 'transport_number');
    }

    public function glassOrder(): string
    {
        return $this->next('GL', 'glass_orders', 'order_number');
    }

    private function next(string $prefix, string $table, string $column): string
    {
        $year = now()->format('Y');
        $fullPrefix = "{$prefix}-{$year}-";

        $latest = DB::table($table)
            ->where($column, 'like', $fullPrefix.'%')
            ->orderByDesc($column)
            ->value($column);

        $sequence = 1;
        if (is_string($latest) && preg_match('/-(\d+)$/', $latest, $m)) {
            $sequence = (int) $m[1] + 1;
        }

        return $fullPrefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}

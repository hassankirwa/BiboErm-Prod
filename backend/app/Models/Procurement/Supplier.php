<?php

namespace App\Models\Procurement;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'category',
        'email',
        'phone',
        'address',
        'is_preferred',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_preferred' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function itemPrices(): HasMany
    {
        return $this->hasMany(SupplierItemPrice::class);
    }
}

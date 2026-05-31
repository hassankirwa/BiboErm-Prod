<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use App\Support\Warehouse\StorableItemCategory;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Item extends Model
{
    use Auditable;

    protected $table = 'warehouse_items';

    protected $fillable = [
        'sku',
        'name',
        'category',
        'unit_of_measure',
        'door_type_id',
        'min_stock_qty',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'min_stock_qty' => 'decimal:3',
            'is_active' => 'boolean',
        ];
    }

    protected function category(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value === null ? null : ItemCategory::from($value),
            set: function (ItemCategory|string|null $value): ?string {
                if ($value === null) {
                    return null;
                }

                $raw = $value instanceof ItemCategory ? $value->value : $value;
                StorableItemCategory::assert($raw);

                return $raw;
            },
        );
    }

    public function auditModule(): string
    {
        return 'warehouse';
    }

    public function doorType(): BelongsTo
    {
        return $this->belongsTo(DoorType::class);
    }

    public function aluminiumProfile(): HasOne
    {
        return $this->hasOne(AluminiumProfile::class, 'item_id');
    }

    public function accessory(): HasOne
    {
        return $this->hasOne(Accessory::class, 'item_id');
    }

    public function rubber(): HasOne
    {
        return $this->hasOne(Rubber::class, 'item_id');
    }

    public function stockLevels(): HasMany
    {
        return $this->hasMany(StockLevel::class, 'item_id');
    }
}

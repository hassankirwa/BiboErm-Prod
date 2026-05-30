<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\DeckSlug;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deck extends Model
{
    protected $table = 'warehouse_decks';

    protected $fillable = [
        'warehouse_id',
        'slug',
        'name',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'slug' => DeckSlug::class,
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class, 'deck_id')->orderBy('sort_order');
    }
}

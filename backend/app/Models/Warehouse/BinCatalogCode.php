<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BinCatalogCode extends Model
{
    protected $table = 'warehouse_bin_catalog_codes';

    protected $fillable = [
        'bin_id',
        'code',
        'normalized_code',
        'source_name',
        'source_description',
        'source_sheet',
        'image_path',
        'source_file',
    ];

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'bin_id');
    }
}

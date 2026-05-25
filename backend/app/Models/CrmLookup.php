<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

abstract class CrmLookup extends Model
{
    protected $fillable = ['slug', 'label', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}

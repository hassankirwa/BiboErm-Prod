<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarehouseBin extends Model
{
    protected $fillable = ['section_id', 'code', 'name'];
}

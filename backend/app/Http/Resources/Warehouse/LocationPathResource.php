<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationPathResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource;
    }
}

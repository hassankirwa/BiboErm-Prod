<?php

namespace App\Enums\Warehouse;

enum OffcutStatus: string
{
    case Available = 'available';
    case Allocated = 'allocated';
    case Consumed = 'consumed';
    case Scrapped = 'scrapped';
}

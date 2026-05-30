<?php

namespace App\Enums\Procurement;

enum GoodsReceiptStatus: string
{
    case Pending = 'pending';
    case Verifying = 'verifying';
    case Verified = 'verified';
    case Rejected = 'rejected';
}

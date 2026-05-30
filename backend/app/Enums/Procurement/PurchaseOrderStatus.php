<?php

namespace App\Enums\Procurement;

enum PurchaseOrderStatus: string
{
    case Draft = 'draft';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case Sent = 'sent';
    case PartialReceived = 'partial_received';
    case Received = 'received';
    case Cancelled = 'cancelled';
}

<?php

namespace App\Enums\Procurement;

enum AttachmentType: string
{
    case ReceiptPhoto = 'receipt_photo';
    case InvoicePhoto = 'invoice_photo';
    case DeliveryNote = 'delivery_note';
}

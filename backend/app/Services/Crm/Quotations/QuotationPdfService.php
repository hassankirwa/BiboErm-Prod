<?php

namespace App\Services\Crm\Quotations;

use App\Models\Quotation;
use Barryvdh\DomPDF\Facade\Pdf;

class QuotationPdfService
{
    public function generate(Quotation $quotation): \Barryvdh\DomPDF\PDF
    {
        $quotation->load(['lines', 'deal', 'account', 'contact', 'preparedBy']);

        return Pdf::loadView('crm.quotation-pdf', [
            'quotation' => $quotation,
        ])->setPaper('a4');
    }
}

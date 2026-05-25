<?php

namespace App\Http\Controllers\Crm\Quotations;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Services\Crm\Quotations\QuotationPdfService;
use Illuminate\Http\Response;

class DownloadQuotationPdfController extends Controller
{
    public function __construct(
        protected QuotationPdfService $pdfService,
    ) {}

    public function __invoke(Quotation $quotation): Response
    {
        $this->authorize('view', $quotation);

        $pdf = $this->pdfService->generate($quotation);
        $filename = ($quotation->quotation_number ?? 'quotation').'.pdf';

        return $pdf->download($filename);
    }
}

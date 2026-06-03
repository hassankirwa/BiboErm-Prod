<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Models\Procurement\PurchaseRequisition;
use App\Services\Procurement\Requisitions\PurchaseRequisitionPdfService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PurchaseRequisitionPdfController extends Controller
{
    public function __construct(
        protected PurchaseRequisitionPdfService $pdf,
    ) {}

    /**
     * Printable HTML document (DomPDF removed; frontend generates client-side PDF).
     */
    public function __invoke(Request $request, PurchaseRequisition $requisition): Response
    {
        $this->authorize('view', $requisition);

        $html = $this->pdf->renderHtml($requisition);

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Requisition documents are generated in the app. Use the Download PDF action on the requisitions page.',
                'html_available' => true,
            ], 410);
        }

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => sprintf(
                'inline; filename="%s.html"',
                str($requisition->reference)->lower()->replace(' ', '-'),
            ),
        ]);
    }
}

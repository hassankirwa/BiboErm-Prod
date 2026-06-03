<?php

namespace App\Services\Procurement\Requisitions;

use App\Models\Procurement\PurchaseRequisition;
use Illuminate\Contracts\View\View;

class PurchaseRequisitionPdfService
{
    public function view(PurchaseRequisition $requisition): View
    {
        $requisition->load([
            'lines.warehouseItem',
            'project.account',
            'supplier',
            'requester',
            'approver',
        ]);

        return view('procurement.requisition-pdf', [
            'requisition' => $requisition,
            'logoDataUri' => $this->logoDataUri(),
        ]);
    }

    public function renderHtml(PurchaseRequisition $requisition): string
    {
        return $this->view($requisition)->render();
    }

    protected function logoDataUri(): ?string
    {
        $candidates = [
            public_path('images/bibo-logo.png'),
            base_path('../frontend/Bibo Wireframes/assets/bibo-logo.png'),
            base_path('../frontend/Bibo Wireframes/uploads/Bibo-logo.png'),
        ];

        foreach ($candidates as $path) {
            if (! is_file($path)) {
                continue;
            }

            $mime = mime_content_type($path) ?: 'image/png';
            $contents = file_get_contents($path);

            if ($contents === false) {
                continue;
            }

            return sprintf('data:%s;base64,%s', $mime, base64_encode($contents));
        }

        return null;
    }
}

<?php

namespace App\Http\Controllers\Procurement\GoodsReceipts;

use App\Enums\Procurement\AttachmentType;
use App\Http\Controllers\Controller;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\GoodsReceiptAttachment;
use App\Services\Media\FileStorageService;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoodsReceiptAttachmentController extends Controller
{
    public function __construct(
        protected FileStorageService $files,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function __invoke(Request $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        $this->authorize('update', $goodsReceipt);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'type' => ['required', 'string', 'in:receipt_photo,invoice_photo,delivery_note,other_document'],
        ]);

        $stored = $this->files->store(
            $validated['file'],
            'procurement-attachments',
            'grn-'.$goodsReceipt->id,
        );

        $attachment = GoodsReceiptAttachment::query()->create([
            'goods_receipt_id' => $goodsReceipt->id,
            'type' => AttachmentType::from($validated['type']),
            'path' => $stored['path'],
            'original_filename' => $validated['file']->getClientOriginalName(),
            'uploaded_by' => $request->user()->id,
            'uploaded_at' => now(),
            'created_at' => now(),
        ]);

        $this->audit->log('grn.attachment_uploaded', $attachment);

        return response()->json([
            'data' => [
                'id' => $attachment->id,
                'type' => $attachment->type->value,
                'path' => $attachment->path,
                'url' => BiboStorage::resolvePrivateApiUrl($attachment->path),
            ],
        ], 201);
    }
}

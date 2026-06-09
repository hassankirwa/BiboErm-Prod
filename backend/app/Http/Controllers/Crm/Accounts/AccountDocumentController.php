<?php

namespace App\Http\Controllers\Crm\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountDocument;
use App\Services\Crm\CrmAttachmentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountDocumentController extends Controller
{
    public function __construct(
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function index(Account $account): JsonResponse
    {
        $this->authorize('view', $account);

        $documents = AccountDocument::query()
            ->where('account_id', $account->id)
            ->latest()
            ->get();

        return response()->json(['data' => $documents]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorize('update', $account);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480'],
            'document_type' => ['required', 'string', 'in:bom,design,accounting,site_photo,other'],
        ]);

        $stored = $this->storage->store(
            $validated['file'],
            'account-'.$account->id.'/'.$validated['document_type'],
        );

        $document = AccountDocument::query()->create([
            'account_id' => $account->id,
            'document_type' => $validated['document_type'],
            'filename' => $stored['filename'] ?? basename($stored['path']),
            'file_path' => $stored['path'],
            'firebase_url' => $stored['url'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $document], 201);
    }
}

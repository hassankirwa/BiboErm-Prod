<?php

namespace App\Http\Controllers;

use App\Http\Resources\Hr\HrDocumentResource;
use App\Models\HrDocument;
use App\Models\User;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MyHrDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $documents = HrDocument::query()
            ->with(['uploader:id,name'])
            ->where(function ($query) use ($user) {
                $query->whereNull('user_id')
                    ->orWhere('user_id', $user->id);
            })
            ->latest('id')
            ->get();

        return HrDocumentResource::collection($documents)->response();
    }

    public function download(HrDocument $hrDocument, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($hrDocument->user_id !== null && $hrDocument->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'document' => [__('You do not have access to this document.')],
            ]);
        }

        return response()->json([
            'url' => BiboStorage::resolvePrivateApiUrl($hrDocument->file_path),
            'filename' => $hrDocument->filename,
        ]);
    }
}

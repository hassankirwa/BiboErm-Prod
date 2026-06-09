<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Resources\Hr\HrDocumentResource;
use App\Models\HrDocument;
use App\Services\Hr\HrDocumentStorageService;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrDocumentController extends Controller
{
    public function __construct(
        private readonly HrDocumentStorageService $storage,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $query = HrDocument::query()
            ->with(['user:id,name', 'uploader:id,name'])
            ->latest('id');

        if ($category = $request->string('category')->toString()) {
            $query->where('category', $category);
        }

        if ($request->has('user_id')) {
            $userId = $request->input('user_id');
            if ($userId === 'null' || $userId === '') {
                $query->whereNull('user_id');
            } elseif (is_numeric($userId)) {
                $query->where('user_id', (int) $userId);
            }
        }

        if ($search = $request->string('search')->toString()) {
            $query->where('title', 'like', '%'.$search.'%');
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => HrDocumentResource::collection($paginated->items()),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:'.implode(',', HrDocument::CATEGORIES)],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $ownerSegment = $validated['user_id']
            ? 'user-'.$validated['user_id']
            : 'company';

        $stored = $this->storage->store($request->file('file'), $ownerSegment);

        $document = HrDocument::query()->create([
            'user_id' => $validated['user_id'] ?? null,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'file_path' => $stored['path'],
            'filename' => $stored['filename'],
            'mime_type' => $request->file('file')?->getClientMimeType(),
            'file_size' => $request->file('file')?->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => __('Document uploaded.'),
            'data' => new HrDocumentResource($document->load(['user', 'uploader'])),
        ], 201);
    }

    public function destroy(HrDocument $hrDocument): JsonResponse
    {
        $this->storage->deleteIfExists($hrDocument->file_path);
        $hrDocument->delete();

        return response()->json([
            'message' => __('Document deleted.'),
        ]);
    }

    public function download(HrDocument $hrDocument): JsonResponse
    {
        return response()->json([
            'url' => BiboStorage::resolvePrivateApiUrl($hrDocument->file_path),
            'filename' => $hrDocument->filename,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Procurement\Suppliers;

use App\Enums\Procurement\SupplierCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\SupplierResource;
use App\Models\Procurement\Supplier;
use App\Services\Procurement\SupplierCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function __construct(
        private readonly SupplierCodeGenerator $supplierCodes,
    ) {}
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Supplier::class);

        $query = Supplier::query()->latest();
        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        return SupplierResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function suggestedCode(Request $request): JsonResponse
    {
        $this->authorize('create', Supplier::class);

        $validated = $request->validate([
            'category' => ['nullable', Rule::enum(SupplierCategory::class)],
        ]);

        $category = isset($validated['category'])
            ? SupplierCategory::from($validated['category'])
            : null;

        return response()->json([
            'code' => $this->supplierCodes->suggest($category),
            'categories' => SupplierCategory::options(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Supplier::class);

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:suppliers,code'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', Rule::enum(SupplierCategory::class)],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'is_preferred' => ['boolean'],
        ]);

        if (blank($validated['code'] ?? null)) {
            $category = isset($validated['category'])
                ? SupplierCategory::from($validated['category'])
                : null;

            if ($category === null) {
                return response()->json([
                    'message' => 'Category is required when supplier code is not provided.',
                    'errors' => ['category' => ['Select a category to generate a supplier code.']],
                ], 422);
            }

            $validated['code'] = $this->supplierCodes->suggest($category);
        }

        $supplier = Supplier::query()->create($validated);

        return (new SupplierResource($supplier))->response()->setStatusCode(201);
    }

    public function show(Supplier $supplier): SupplierResource
    {
        $this->authorize('view', $supplier);

        return new SupplierResource($supplier->load('itemPrices'));
    }

    public function update(Request $request, Supplier $supplier): SupplierResource
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['nullable', Rule::enum(SupplierCategory::class)],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'is_preferred' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $supplier->update($validated);

        return new SupplierResource($supplier->fresh());
    }
}

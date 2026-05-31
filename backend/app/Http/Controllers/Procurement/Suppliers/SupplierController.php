<?php

namespace App\Http\Controllers\Procurement\Suppliers;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\SupplierResource;
use App\Models\Procurement\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SupplierController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Supplier::class);

        $query = Supplier::query()->latest();
        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        return SupplierResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Supplier::class);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:suppliers,code'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'is_preferred' => ['boolean'],
        ]);

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
            'category' => ['nullable', 'string', 'max:64'],
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

<?php

namespace App\Http\Controllers\Procurement\Drivers;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\DriverResource;
use App\Models\Procurement\Driver;
use App\Services\Procurement\DriverCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function __construct(
        private readonly DriverCodeGenerator $driverCodes,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Driver::class);

        $query = Driver::query()->latest();

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', $search)
                    ->orWhere('code', 'like', $search)
                    ->orWhere('phone', 'like', $search)
                    ->orWhere('vehicle_registration', 'like', $search);
            });
        }

        return DriverResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function suggestedCode(Request $request): JsonResponse
    {
        $this->authorize('create', Driver::class);

        return response()->json([
            'code' => $this->driverCodes->suggest(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Driver::class);

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:procurement_drivers,code'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'vehicle_registration' => ['nullable', 'string', 'max:100'],
            'vehicle_type' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string'],
        ]);

        if (blank($validated['code'] ?? null)) {
            $validated['code'] = $this->driverCodes->suggest();
        }

        $driver = Driver::query()->create($validated);

        return (new DriverResource($driver))->response()->setStatusCode(201);
    }

    public function show(Driver $driver): DriverResource
    {
        $this->authorize('view', $driver);

        return new DriverResource($driver);
    }

    public function update(Request $request, Driver $driver): DriverResource
    {
        $this->authorize('update', $driver);

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('procurement_drivers', 'code')->ignore($driver->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'vehicle_registration' => ['nullable', 'string', 'max:100'],
            'vehicle_type' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $driver->update($validated);

        return new DriverResource($driver->fresh());
    }
}

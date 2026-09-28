<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Resources\Hr\PayrollEntryResource;
use App\Http\Resources\Hr\PayrollRunResource;
use App\Models\EmployeeProfile;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\Hr\PayrollCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PayrollRunController extends Controller
{
    public function __construct(
        private readonly PayrollCalculationService $calculator,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $query = PayrollRun::query()
            ->with(['creator:id,name', 'approver:id,name'])
            ->withCount('entries')
            ->latest('period_year')
            ->latest('period_month');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => PayrollRunResource::collection($paginated->items()),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    public function show(PayrollRun $payrollRun): JsonResponse
    {
        $payrollRun->load([
            'creator:id,name',
            'approver:id,name',
            'entries.user.employeeProfile',
        ]);

        return response()->json([
            'data' => new PayrollRunResource($payrollRun),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'period_month' => ['required', 'integer', 'min:1', 'max:12'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $exists = PayrollRun::query()
            ->where('period_year', $validated['period_year'])
            ->where('period_month', $validated['period_month'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'period_month' => [__('A payroll run already exists for this period.')],
            ]);
        }

        /** @var User $user */
        $user = $request->user();

        $run = PayrollRun::query()->create([
            'period_year' => $validated['period_year'],
            'period_month' => $validated['period_month'],
            'status' => PayrollRun::STATUS_DRAFT,
            'created_by' => $user->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => __('Payroll run created.'),
            'data' => new PayrollRunResource($run->load(['creator'])),
        ], 201);
    }

    public function generate(PayrollRun $payrollRun): JsonResponse
    {
        if ($payrollRun->status !== PayrollRun::STATUS_DRAFT) {
            throw ValidationException::withMessages([
                'payroll' => [__('Entries can only be generated for draft payroll runs.')],
            ]);
        }

        $employees = User::query()
            ->where('status', User::STATUS_ACTIVE)
            ->whereHas('employeeProfile', function ($query) {
                $query->whereNotNull('monthly_gross_salary')
                    ->where('monthly_gross_salary', '>', 0);
            })
            ->with('employeeProfile')
            ->get();

        $payrollRun->entries()->delete();

        foreach ($employees as $employee) {
            $basic = (float) $employee->employeeProfile?->monthly_gross_salary;
            $calculated = $this->calculator->calculate(
                $basic,
                0,
                $employee,
                (int) $payrollRun->period_year,
                (int) $payrollRun->period_month,
            );

            PayrollEntry::query()->create([
                'payroll_run_id' => $payrollRun->id,
                'user_id' => $employee->id,
                ...$calculated,
            ]);
        }

        $payrollRun->load(['entries.user.employeeProfile', 'creator']);

        return response()->json([
            'message' => __('Payroll entries generated.'),
            'data' => new PayrollRunResource($payrollRun),
        ]);
    }

    public function updateEntry(
        PayrollRun $payrollRun,
        PayrollEntry $payrollEntry,
        Request $request,
    ): JsonResponse {
        if ($payrollRun->status !== PayrollRun::STATUS_DRAFT) {
            throw ValidationException::withMessages([
                'payroll' => [__('Only draft payroll runs can be edited.')],
            ]);
        }

        if ($payrollEntry->payroll_run_id !== $payrollRun->id) {
            abort(404);
        }

        $validated = $request->validate([
            'gross_salary' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'recalculate' => ['sometimes', 'boolean'],
        ]);

        $employee = $payrollEntry->user()->with('employeeProfile')->first();
        if (! $employee) {
            abort(404);
        }

        $recalculate = (bool) ($validated['recalculate'] ?? false);
        // Manual other is only an extra override; configured pay-component deductions
        // are always pulled from the employee record during calculation.
        $manualOther = array_key_exists('other_deductions', $validated)
            ? (float) $validated['other_deductions']
            : 0.0;

        if ($recalculate || ! array_key_exists('gross_salary', $validated)) {
            $basic = (float) ($employee->employeeProfile?->monthly_gross_salary ?? 0);
        } else {
            $additionsTotal = (float) ($payrollEntry->additions_total ?? 0);
            $basic = max(0, (float) $validated['gross_salary'] - $additionsTotal);
        }

        if ($basic <= 0) {
            throw ValidationException::withMessages([
                'gross_salary' => [__('Employee monthly gross salary must be set before recalculating.')],
            ]);
        }

        $calculated = $this->calculator->calculate(
            $basic,
            $manualOther,
            $employee,
            (int) $payrollRun->period_year,
            (int) $payrollRun->period_month,
        );

        $payrollEntry->update($calculated);

        return response()->json([
            'message' => __('Payroll entry updated.'),
            'data' => new PayrollEntryResource($payrollEntry->fresh(['user.employeeProfile'])),
        ]);
    }

    public function submit(PayrollRun $payrollRun): JsonResponse
    {
        if ($payrollRun->status !== PayrollRun::STATUS_DRAFT) {
            throw ValidationException::withMessages([
                'payroll' => [__('Only draft payroll runs can be submitted.')],
            ]);
        }

        if (! $payrollRun->entries()->exists()) {
            throw ValidationException::withMessages([
                'payroll' => [__('Generate payroll entries before submitting.')],
            ]);
        }

        $payrollRun->update([
            'status' => PayrollRun::STATUS_PENDING_FINANCE,
            'submitted_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => __('Payroll run submitted for finance approval.'),
            'data' => new PayrollRunResource($payrollRun->fresh(['creator', 'approver'])),
        ]);
    }
}

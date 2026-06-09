<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Resources\Hr\PayrollRunResource;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\Hr\PayslipPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PayrollApprovalController extends Controller
{
    public function __construct(
        private readonly PayslipPdfService $payslips,
    ) {}

    public function approve(PayrollRun $payrollRun): JsonResponse
    {
        if ($payrollRun->status !== PayrollRun::STATUS_PENDING_FINANCE) {
            throw ValidationException::withMessages([
                'payroll' => [__('Only payroll runs pending finance approval can be approved.')],
            ]);
        }

        /** @var User $approver */
        $approver = request()->user();

        $entries = $payrollRun->entries()->with('user.employeeProfile')->get();

        foreach ($entries as $entry) {
            $path = $this->payslips->generateAndStore($entry);
            $entry->update(['payslip_path' => $path]);
        }

        $payrollRun->update([
            'status' => PayrollRun::STATUS_APPROVED,
            'approved_by' => $approver->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => __('Payroll run approved and payslips generated.'),
            'data' => new PayrollRunResource($payrollRun->fresh(['creator', 'approver', 'entries.user.employeeProfile'])),
        ]);
    }

    public function reject(PayrollRun $payrollRun, Request $request): JsonResponse
    {
        if ($payrollRun->status !== PayrollRun::STATUS_PENDING_FINANCE) {
            throw ValidationException::withMessages([
                'payroll' => [__('Only payroll runs pending finance approval can be rejected.')],
            ]);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $payrollRun->update([
            'status' => PayrollRun::STATUS_DRAFT,
            'submitted_at' => null,
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => __('Payroll run returned to draft.'),
            'data' => new PayrollRunResource($payrollRun->fresh(['creator', 'approver'])),
        ]);
    }
}

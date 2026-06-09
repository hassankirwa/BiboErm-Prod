<?php

namespace App\Http\Controllers;

use App\Http\Resources\Hr\PayrollEntryResource;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\User;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MyPayslipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $entries = PayrollEntry::query()
            ->where('user_id', $user->id)
            ->whereHas('payrollRun', fn ($query) => $query->where('status', PayrollRun::STATUS_APPROVED))
            ->whereNotNull('payslip_path')
            ->with(['payrollRun', 'user.employeeProfile'])
            ->latest('id')
            ->get();

        return PayrollEntryResource::collection($entries)->response();
    }

    public function download(PayrollEntry $payrollEntry, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($payrollEntry->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'payslip' => [__('You do not have access to this payslip.')],
            ]);
        }

        $payrollEntry->load('payrollRun');

        if ($payrollEntry->payrollRun?->status !== PayrollRun::STATUS_APPROVED || ! $payrollEntry->payslip_path) {
            throw ValidationException::withMessages([
                'payslip' => [__('This payslip is not available yet.')],
            ]);
        }

        return response()->json([
            'url' => BiboStorage::resolvePrivateApiUrl($payrollEntry->payslip_path),
            'filename' => sprintf(
                'payslip-%04d-%02d.pdf',
                $payrollEntry->payrollRun->period_year,
                $payrollEntry->payrollRun->period_month,
            ),
        ]);
    }
}

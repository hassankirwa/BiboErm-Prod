<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Services\Hr\EmployeeNumberGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrEmployeeLookupController extends Controller
{
    public function __construct(
        private readonly EmployeeNumberGenerator $employeeNumbers,
    ) {}

    public function suggestedEmployeeNumber(Request $request): JsonResponse
    {
        $excludeUserId = $request->integer('exclude_user_id');

        return response()->json([
            'employee_number' => $this->employeeNumbers->suggest(
                $excludeUserId > 0 ? $excludeUserId : null,
            ),
        ]);
    }
}

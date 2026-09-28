<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Services\Hr\EmployeeExcelImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployeeImportController extends Controller
{
    public function __construct(
        private readonly EmployeeExcelImportService $imports,
    ) {}

    public function extract(Request $request): JsonResponse
    {
        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        $request->validate([
            'file' => ['required', 'file', 'max:51200'],
        ]);

        $token = (string) Str::uuid();
        $data = $this->imports->extract($request->file('file'), $token);

        return response()->json([
            'data' => $data,
            'meta' => ['extract_token' => $data['extract_token']],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'extract_token' => ['nullable', 'string', 'max:80'],
        ]);

        $result = $this->imports->import(
            $validated['rows'],
            $validated['extract_token'] ?? null,
            $request->user(),
        );

        return response()->json([
            'message' => __('Staff import completed.'),
            'data' => $result,
        ], 201);
    }

    public function discard(string $token): JsonResponse
    {
        $this->imports->discard($token);

        return response()->json(['data' => ['discarded' => true]]);
    }
}

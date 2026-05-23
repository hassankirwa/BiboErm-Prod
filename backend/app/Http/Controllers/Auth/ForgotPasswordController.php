<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function store(ForgotPasswordRequest $request): JsonResponse
    {
        Password::broker()->sendResetLink($request->only('email'));

        return response()->json([
            'message' => __('If that email exists, we sent a reset link.'),
        ]);
    }
}

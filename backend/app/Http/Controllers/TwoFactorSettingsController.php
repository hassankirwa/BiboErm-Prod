<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\TwoFactorToggleRequest;
use App\Models\User;
use App\Services\Auth\TwoFactorService;
use App\Services\Audit\OwenAuditLogger;
use Illuminate\Http\JsonResponse;

class TwoFactorSettingsController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactor,
        private readonly OwenAuditLogger $audit,
    ) {}

    public function enable(TwoFactorToggleRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->twoFactor->enable($user, $request->validated('password'));

        $this->audit->log(
            module: 'auth',
            action: 'two_factor_enabled',
            entityType: 'user',
            entityId: $user->id,
        );

        return response()->json([
            'message' => __('Two-factor authentication enabled.'),
            'two_factor_enabled' => true,
        ]);
    }

    public function disable(TwoFactorToggleRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->twoFactor->disable($user, $request->validated('password'));

        $this->audit->log(
            module: 'auth',
            action: 'two_factor_disabled',
            entityType: 'user',
            entityId: $user->id,
        );

        return response()->json([
            'message' => __('Two-factor authentication disabled.'),
            'two_factor_enabled' => false,
        ]);
    }
}

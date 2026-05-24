<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\TwoFactorResendRequest;
use App\Http\Requests\Auth\TwoFactorVerifyRequest;
use App\Models\User;
use App\Services\Auth\LoginCompletionService;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;

class TwoFactorLoginController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactor,
        private readonly LoginCompletionService $loginCompletion,
    ) {}

    public function verify(TwoFactorVerifyRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $remember = $this->twoFactor->rememberFromChallenge($validated['challenge_token']);

        /** @var User $user */
        $user = $this->twoFactor->verifyChallenge(
            $validated['challenge_token'],
            $validated['code'],
        );

        if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE], true)) {
            return response()->json(['message' => 'Your account is not active.'], 403);
        }

        return $this->loginCompletion->complete($user, $request, $remember);
    }

    public function resend(TwoFactorResendRequest $request): JsonResponse
    {
        $challenge = $this->twoFactor->resendChallenge($request->validated('challenge_token'));

        return response()->json([
            'message' => __('A new verification code has been sent.'),
            'challenge_token' => $challenge['token'],
            'email_hint' => $challenge['email_hint'],
            'expires_in' => $challenge['expires_in'],
            'mail_sent' => $challenge['mail_sent'],
            'mail_warning' => $challenge['mail_warning'],
        ]);
    }
}

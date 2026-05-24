<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\SendsAuthResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\Auth\LoginCompletionService;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    use SendsAuthResponses;

    public function __construct(
        private readonly LoginCompletionService $loginCompletion,
        private readonly TwoFactorService $twoFactor,
    ) {}

    public function store(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        /** @var User $user */
        $user = Auth::user();

        if ($user->status === User::STATUS_INVITED) {
            if (! $user->must_change_password) {
                Auth::logout();

                return response()->json(['message' => 'Please complete your invitation acceptance first.'], 422);
            }
        }

        if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE], true)) {
            Auth::logout();

            return response()->json(['message' => 'Your account is not active.'], 403);
        }

        if ($user->two_factor_enabled) {
            $remember = $request->boolean('remember');
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $challenge = $this->twoFactor->issueChallenge($user, $remember);

            return response()->json([
                'two_factor_required' => true,
                'challenge_token' => $challenge['token'],
                'email_hint' => $challenge['email_hint'],
                'expires_in' => $challenge['expires_in'],
                'mail_sent' => $challenge['mail_sent'],
                'mail_warning' => $challenge['mail_warning'],
            ]);
        }

        return $this->loginCompletion->complete($user, $request, $request->boolean('remember'));
    }
}

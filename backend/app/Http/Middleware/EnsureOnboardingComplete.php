<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Intended for authenticated workspace routes that require an active onboarding state.
 * Do not attach to `/api/profile`, `/api/auth/me`, or auth logout.
 */
class EnsureOnboardingComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            if ($user->status === User::STATUS_INVITED) {
                return response()->json(['message' => __('Please accept your invitation.')], Response::HTTP_FORBIDDEN);
            }

            if (! $user->onboarding_completed_at) {
                return response()->json([
                    'message' => __('Complete your profile to continue.'),
                    'redirect' => '/onboarding/profile',
                ], Response::HTTP_FORBIDDEN);
            }

            if ($user->status === User::STATUS_PENDING_HR_REVIEW) {
                return response()->json([
                    'message' => __('Awaiting HR review.'),
                    'redirect' => '/onboarding/pending-hr',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        return $next($request);
    }
}

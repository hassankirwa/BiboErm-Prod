<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            // §10.1: block suspended/inactive + invited tokens on protected endpoints.
            if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE], true)) {
                return response()->json(['message' => __('Your account is not active.')], Response::HTTP_FORBIDDEN);
            }

            if ($user->status === User::STATUS_INVITED) {
                $changingPassword = $request->is('api/auth/change-password');

                if (! $changingPassword || ! $user->must_change_password) {
                    return response()->json(['message' => __('Please accept your invitation first.')], Response::HTTP_FORBIDDEN);
                }
            }
        }

        return $next($request);
    }
}

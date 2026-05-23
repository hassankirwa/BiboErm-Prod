<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Device\DeviceTrustService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTrustedDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        $roles = array_values(array_filter(array_map(trim(...), config('bibo.device_lock.enforce_on_roles', []))));

        if (! app(DeviceTrustService::class)->requestDeviceIsTrusted($user instanceof User ? $user : null, $request->header('X-Device-Id'), $roles)) {
            return response()->json([
                'message' => __('Unrecognized device. Sign in once with header X-Device-Id matching the app client ID.'),
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}

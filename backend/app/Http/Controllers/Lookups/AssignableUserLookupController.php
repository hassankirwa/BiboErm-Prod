<?php

namespace App\Http\Controllers\Lookups;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignableUserLookupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->trim()->toString();
        $role = $request->string('role')->toString();
        $limit = min(max((int) $request->integer('limit', 200), 1), 500);

        $users = User::query()
            ->when(
                $status !== '',
                fn ($q) => $q->where('status', $status),
                fn ($q) => $q->where('status', User::STATUS_ACTIVE),
            )
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($role !== '', fn ($q) => $q->role($role))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'email', 'status']);

        return response()->json(['data' => $users]);
    }
}

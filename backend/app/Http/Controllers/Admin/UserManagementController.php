<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PatchUserStatusRequest;
use App\Http\Requests\Admin\ReplaceUserAssignmentsRequest;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Services\Auth\RefreshTokenService;
use App\Services\Audit\OwenAuditLogger;
use App\Support\DepartmentRoleAssignmentRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserManagementController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
        private readonly RefreshTokenService $refreshTokens,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);

        $users = User::query()
            ->with([
                'profile',
                'employeeProfile',
                'departmentRoles.role',
                'departmentRoles.department',
            ])
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($users);
    }

    public function updateStatus(User $user, PatchUserStatusRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        abort_if($user->id === $actor->id, JsonResponse::HTTP_FORBIDDEN, 'You cannot change your own workspace status.');

        $validated = $request->validated();

        $oldStatus = $user->status;

        $user->status = $validated['status'];

        if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE], true)) {
            $this->refreshTokens->clearRefreshToken($user);
        }

        $user->save();

        $action = match ($validated['status']) {
            User::STATUS_ACTIVE => 'activate',
            User::STATUS_SUSPENDED, User::STATUS_INACTIVE => 'suspend',
            default => 'status',
        };

        $this->audit->log(
            module: 'users',
            action: $action,
            entityType: 'user',
            entityId: $user->id,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => $user->status],
        );

        return response()->json(['message' => __('Status updated.'), 'user' => $this->minimalUserPayload($user->fresh(['profile']))]);
    }

    public function replaceAssignments(User $user, ReplaceUserAssignmentsRequest $request): JsonResponse
    {
        $data = $request->validated();
        DepartmentRoleAssignmentRules::validate(
            (int) $data['department_id'],
            (int) $data['role_id'],
            $data['additional_assignments']
        );

        /** @var User $actor */
        $actor = $request->user();

        DB::transaction(function () use ($user, $data, $actor): void {
            UserDepartmentRole::query()->where('user_id', $user->id)->delete();

            $assignmentRows = [];
            $seen = [];
            $primaryKey = $data['department_id'].'-'.$data['role_id'];
            $seen[$primaryKey] = true;
            $assignmentRows[] = [
                'department_id' => (int) $data['department_id'],
                'role_id' => (int) $data['role_id'],
                'is_primary' => true,
            ];

            foreach ($data['additional_assignments'] as $row) {
                $k = ((int) $row['department_id']).'-'.((int) $row['role_id']);
                if (isset($seen[$k])) {
                    continue;
                }
                $seen[$k] = true;
                $assignmentRows[] = [
                    'department_id' => (int) $row['department_id'],
                    'role_id' => (int) $row['role_id'],
                    'is_primary' => false,
                ];
            }

            foreach ($assignmentRows as $row) {
                UserDepartmentRole::query()->create([
                    'user_id' => $user->id,
                    'department_id' => $row['department_id'],
                    'role_id' => $row['role_id'],
                    'is_primary' => $row['is_primary'],
                    'assigned_by' => $actor->id,
                    'assigned_at' => now(),
                ]);
            }

            UserDepartmentRole::query()->where('user_id', $user->id)->update(['is_primary' => false]);
            UserDepartmentRole::query()
                ->where('user_id', $user->id)
                ->where('department_id', $data['department_id'])
                ->where('role_id', $data['role_id'])
                ->update(['is_primary' => true]);
        });

        $this->audit->log(
            module: 'users',
            action: 'assignments_replaced',
            entityType: 'user',
            entityId: $user->id,
            newValues: ['department_id' => $data['department_id'], 'role_id' => $data['role_id']],
        );

        return response()->json(['message' => __('Assignments updated.')]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function minimalUserPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'status' => $user->status,
            'name' => $user->name,
            'profile' => $user->relationLoaded('profile') ? $user->profile : null,
        ];
    }
}

<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RecoverEmailRequest;
use App\Mail\EmailRecoveryMail;
use App\Models\EmployeeProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class RecoverEmailController extends Controller
{
    public function store(RecoverEmailRequest $request): JsonResponse
    {
        $needle = preg_replace('/\s+/u', '', (string) $request->validated('employee_number'));

        /** @var EmployeeProfile|null $row */
        $row = EmployeeProfile::query()->where('employee_number', $needle)->first();

        if ($row) {
            $user = $row->user()->first(['id', 'email']);
            if ($user?->email) {
                Mail::to($user->email)->queue(new EmailRecoveryMail(
                    self::hintEmailMask($user->email),
                    $user->email
                ));
            }
        }

        return response()->json([
            'message' => __('If a matching account exists, we sent your login email address.'),
        ]);
    }

    private static function hintEmailMask(string $email): string
    {
        $email = strtolower(trim($email));
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $domain ??= '';

        if ($local === '' || $domain === '') {
            return '***';
        }

        if (strlen($local) <= 2) {
            return '*'.'@'.$domain;
        }

        return substr($local, 0, 1).'***'.substr($local, -1).'@'.$domain;
    }
}

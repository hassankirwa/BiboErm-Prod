<?php

namespace App\Services\Auth;

use App\Mail\LoginOtpMail;
use App\Models\LoginOtpCode;
use App\Models\User;
use App\Services\Mail\MailDeliveryResult;
use App\Services\Mail\OutgoingMailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class TwoFactorService
{
    public function __construct(
        private readonly OutgoingMailService $mail,
    ) {}

    /**
     * @return array{token: string, email_hint: string, mail_sent: bool, mail_warning: ?string, expires_in: int}
     */
    public function issueChallenge(User $user, bool $remember = false): array
    {
        $this->purgeStaleForUser($user);

        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(64);
        $expiresIn = max(60, (int) config('bibo.two_factor.otp_expire_minutes', 10) * 60);

        LoginOtpCode::query()->create([
            'user_id' => $user->id,
            'challenge_token' => $token,
            'code_hash' => Hash::make($plainCode),
            'remember' => $remember,
            'expires_at' => now()->addSeconds($expiresIn),
        ]);

        $mailResult = $this->mail->send(
            new LoginOtpMail($user, $plainCode, now()->addSeconds($expiresIn)),
            $user->email,
        );

        return [
            'token' => $token,
            'email_hint' => $this->maskEmail($user->email),
            'mail_sent' => $mailResult->sent,
            'mail_warning' => $mailResult->warning,
            'expires_in' => $expiresIn,
        ];
    }

    /**
     * @return array{token: string, email_hint: string, mail_sent: bool, mail_warning: ?string, expires_in: int}
     */
    public function resendChallenge(string $challengeToken): array
    {
        $existing = $this->findOpenChallenge($challengeToken);

        return $this->issueChallenge($existing->user, (bool) $existing->remember);
    }

    public function verifyChallenge(string $challengeToken, string $code): User
    {
        $challenge = $this->findOpenChallenge($challengeToken);

        if (! Hash::check($code, $challenge->code_hash)) {
            throw ValidationException::withMessages([
                'code' => [__('The verification code is incorrect.')],
            ]);
        }

        return DB::transaction(function () use ($challenge): User {
            $challenge->forceFill(['used_at' => now()])->save();

            LoginOtpCode::query()
                ->where('user_id', $challenge->user_id)
                ->whereNull('used_at')
                ->whereKeyNot($challenge->id)
                ->delete();

            /** @var User $user */
            $user = User::query()->findOrFail($challenge->user_id);

            return $user;
        });
    }

    public function rememberFromChallenge(string $challengeToken): bool
    {
        return (bool) $this->findOpenChallenge($challengeToken)->remember;
    }

    public function enable(User $user, string $password): void
    {
        $this->assertPassword($user, $password);

        $user->forceFill(['two_factor_enabled' => true])->save();
    }

    public function disable(User $user, string $password): void
    {
        $this->assertPassword($user, $password);

        $user->forceFill(['two_factor_enabled' => false])->save();

        LoginOtpCode::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();
    }

    public function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) {
            return $email;
        }

        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, 1);
        $hiddenLength = max(1, mb_strlen($local) - 1);

        return $visible.str_repeat('*', $hiddenLength).'@'.$domain;
    }

    private function findOpenChallenge(string $challengeToken): LoginOtpCode
    {
        /** @var LoginOtpCode|null $challenge */
        $challenge = LoginOtpCode::query()
            ->where('challenge_token', $challengeToken)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $challenge) {
            throw ValidationException::withMessages([
                'challenge_token' => [__('This sign-in challenge has expired. Please sign in again.')],
            ]);
        }

        return $challenge;
    }

    private function purgeStaleForUser(User $user): void
    {
        LoginOtpCode::query()
            ->where('user_id', $user->id)
            ->where(function ($query): void {
                $query->whereNotNull('used_at')
                    ->orWhere('expires_at', '<=', now());
            })
            ->delete();

        LoginOtpCode::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();
    }

    private function assertPassword(User $user, string $password): void
    {
        if (! Hash::check($password, $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'password' => [__('Current password is incorrect.')],
            ]);
        }
    }
}

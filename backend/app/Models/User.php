<?php

namespace App\Models;

use App\Mail\PasswordResetRequestedMail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    public const STATUS_INVITED = 'invited';

    public const STATUS_PENDING_PROFILE_COMPLETION = 'pending_profile_completion';

    public const STATUS_PENDING_HR_REVIEW = 'pending_hr_review';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_INACTIVE = 'inactive';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'email_verified_at',
        'invited_by',
        'onboarding_completed_at',
        'must_change_password',
        'two_factor_enabled',
        'refresh_token_hash',
        'refresh_token_expires_at',
        'refresh_token_issued_at',
        'last_login_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'refresh_token_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'must_change_password' => 'boolean',
            'two_factor_enabled' => 'boolean',
            'refresh_token_expires_at' => 'datetime',
            'refresh_token_issued_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * @return BelongsTo<User, User>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * @return HasMany<UserDepartmentRole, User>
     */
    public function departmentRoles(): HasMany
    {
        return $this->hasMany(UserDepartmentRole::class);
    }

    /**
     * @return HasMany<UserInvitation, User>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(UserInvitation::class);
    }

    /**
     * @return HasOne<UserProfile, User>
     */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * @return HasOne<EmployeeProfile, User>
     */
    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * @return HasMany<UserDevice, User>
     */
    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    /**
     * @return HasMany<ProfileChangeRequest, User>
     */
    public function profileChangeRequests(): HasMany
    {
        return $this->hasMany(ProfileChangeRequest::class);
    }

    /**
     * @return HasMany<LeaveRequest, User>
     */
    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    /**
     * @return HasMany<HrDocument, User>
     */
    public function hrDocuments(): HasMany
    {
        return $this->hasMany(HrDocument::class);
    }

    /**
     * @return HasMany<PayrollEntry, User>
     */
    public function payrollEntries(): HasMany
    {
        return $this->hasMany(PayrollEntry::class);
    }

    /**
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        Mail::to($this->email)->queue(new PasswordResetRequestedMail($this, $token));
    }
}

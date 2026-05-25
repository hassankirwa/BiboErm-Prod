<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'contact_number',
        'account_id',
        'first_name',
        'last_name',
        'name',
        'email',
        'phone',
        'whatsapp',
        'job_title',
        'preferred_contact_method',
        'status',
        'owner_id',
        'contact_owner_id',
        'source_lead_id',
        'notes',
        'created_by',
    ];

    public function auditModule(): string
    {
        return 'crm';
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contactOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contact_owner_id');
    }

    public function sourceLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'source_lead_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'primary_contact_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }
}

<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'account_number',
        'name',
        'account_type',
        'industry',
        'phone',
        'email',
        'website',
        'kra_pin',
        'billing_address',
        'physical_address',
        'county_id',
        'status',
        'owner_id',
        'account_owner_id',
        'primary_contact_id',
        'source_lead_id',
        'created_by',
    ];

    public function auditModule(): string
    {
        return 'crm';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function accountOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_owner_id');
    }

    public function county(): BelongsTo
    {
        return $this->belongsTo(CrmCounty::class, 'county_id');
    }

    public function primaryContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function sourceLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'source_lead_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }
}

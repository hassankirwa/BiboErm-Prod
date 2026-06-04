<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\FieldPhotoAttachableType;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldInstallationPhoto extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'job_id',
        'attachable_type',
        'attachable_id',
        'file_path',
        'firebase_url',
        'caption',
        'taken_at',
        'uploaded_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'attachable_type' => FieldPhotoAttachableType::class,
            'taken_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

<?php

namespace App\Models\QualityControl;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QcInspectionPhoto extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'inspection_id',
        'defect_id',
        'checklist_key',
        'file_path',
        'firebase_url',
        'caption',
        'uploaded_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(QcInspection::class, 'inspection_id');
    }

    public function defect(): BelongsTo
    {
        return $this->belongsTo(QcDefect::class, 'defect_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

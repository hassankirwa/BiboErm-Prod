<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\AttachmentType;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptAttachment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'goods_receipt_id',
        'type',
        'path',
        'firebase_url',
        'original_filename',
        'uploaded_by',
        'uploaded_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => AttachmentType::class,
            'uploaded_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

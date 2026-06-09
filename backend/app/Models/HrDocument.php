<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HrDocument extends Model
{
    public const CATEGORY_POLICY = 'policy';

    public const CATEGORY_CONTRACT = 'contract';

    public const CATEGORY_PAYSLIP = 'payslip';

    public const CATEGORY_CERTIFICATE = 'certificate';

    public const CATEGORY_OTHER = 'other';

    /**
     * @var list<string>
     */
    public const CATEGORIES = [
        self::CATEGORY_POLICY,
        self::CATEGORY_CONTRACT,
        self::CATEGORY_PAYSLIP,
        self::CATEGORY_CERTIFICATE,
        self::CATEGORY_OTHER,
    ];

    protected $fillable = [
        'user_id',
        'title',
        'category',
        'file_path',
        'filename',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    /**
     * @return BelongsTo<User, HrDocument>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, HrDocument>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

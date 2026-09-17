<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePayComponent extends Model
{
    public const KIND_ADDITION = 'addition';

    public const KIND_DEDUCTION = 'deduction';

    public const CATEGORY_BONUS = 'bonus';

    public const CATEGORY_OVERTIME = 'overtime';

    public const CATEGORY_HOUSE_ALLOWANCE = 'house_allowance';

    public const CATEGORY_TRANSPORT_ALLOWANCE = 'transport_allowance';

    public const CATEGORY_OTHER_ALLOWANCE = 'other_allowance';

    public const CATEGORY_DAMAGE = 'damage';

    public const CATEGORY_LOST_TOOL = 'lost_tool';

    public const CATEGORY_SALARY_ADVANCE = 'salary_advance';

    public const CATEGORY_CUSTOM = 'custom';

    /**
     * @var list<string>
     */
    public const KINDS = [
        self::KIND_ADDITION,
        self::KIND_DEDUCTION,
    ];

    /**
     * @var list<string>
     */
    public const ADDITION_CATEGORIES = [
        self::CATEGORY_BONUS,
        self::CATEGORY_OVERTIME,
        self::CATEGORY_HOUSE_ALLOWANCE,
        self::CATEGORY_TRANSPORT_ALLOWANCE,
        self::CATEGORY_OTHER_ALLOWANCE,
        self::CATEGORY_CUSTOM,
    ];

    /**
     * @var list<string>
     */
    public const DEDUCTION_CATEGORIES = [
        self::CATEGORY_DAMAGE,
        self::CATEGORY_LOST_TOOL,
        self::CATEGORY_SALARY_ADVANCE,
        self::CATEGORY_CUSTOM,
    ];

    protected $fillable = [
        'user_id',
        'kind',
        'category',
        'label',
        'amount',
        'is_recurring',
        'effective_from',
        'effective_to',
        'reference',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_recurring' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, EmployeePayComponent>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, EmployeePayComponent>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function appliesToPeriod(int $year, int $month): bool
    {
        $periodStart = \Carbon\CarbonImmutable::create($year, $month, 1)->startOfDay();
        $periodEnd = $periodStart->endOfMonth();

        if ($this->effective_from !== null && $this->effective_from->greaterThan($periodEnd)) {
            return false;
        }

        if ($this->effective_to !== null && $this->effective_to->lessThan($periodStart)) {
            return false;
        }

        if (! $this->is_recurring && $this->effective_from === null && $this->effective_to === null) {
            return true;
        }

        return true;
    }
}

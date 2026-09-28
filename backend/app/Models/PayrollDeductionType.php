<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollDeductionType extends Model
{
    public const METHOD_PERCENT_OF_GROSS = 'percent_of_gross';

    public const METHOD_PERCENT_OF_TAXABLE = 'percent_of_taxable';

    public const METHOD_FIXED = 'fixed';

    public const METHOD_NSSF_TIERED = 'nssf_tiered';

    public const METHOD_PAYE_BANDS = 'paye_bands';

    public const CODE_SHIF = 'shif';

    public const CODE_NSSF = 'nssf';

    public const CODE_PAYE = 'paye';

    public const CODE_HOUSING_LEVY = 'housing_levy';

    /**
     * @var list<string>
     */
    public const METHODS = [
        self::METHOD_PERCENT_OF_GROSS,
        self::METHOD_PERCENT_OF_TAXABLE,
        self::METHOD_FIXED,
        self::METHOD_NSSF_TIERED,
        self::METHOD_PAYE_BANDS,
    ];

    protected $fillable = [
        'code',
        'name',
        'method',
        'rate',
        'amount',
        'tax_deductible',
        'enabled',
        'is_system',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'amount' => 'decimal:2',
            'tax_deductible' => 'boolean',
            'enabled' => 'boolean',
            'is_system' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}

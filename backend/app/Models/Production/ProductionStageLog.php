<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionStageLog extends Model
{
    protected $fillable = [
        'production_order_id',
        'stage',
        'status',
        'completed_by',
        'started_at',
        'completed_at',
        'notes',
        'evidence_path',
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProductionStage::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * @param  list<string>  $paths
     */
    public static function encodeEvidencePaths(array $paths): ?string
    {
        $paths = array_values(array_filter($paths, fn ($path) => is_string($path) && $path !== ''));

        if ($paths === []) {
            return null;
        }

        if (count($paths) === 1) {
            return $paths[0];
        }

        return json_encode($paths, JSON_THROW_ON_ERROR);
    }

    /**
     * @return list<string>
     */
    public static function decodeEvidencePaths(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }

        $trimmed = trim($value);
        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (! is_array($decoded)) {
                return [];
            }

            return array_values(array_filter(
                $decoded,
                fn ($path) => is_string($path) && $path !== '',
            ));
        }

        return [$value];
    }

    /**
     * @return list<string>
     */
    public function evidencePaths(): array
    {
        return self::decodeEvidencePaths($this->evidence_path);
    }
}

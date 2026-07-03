<?php

namespace App\Support\Crm;

use App\Enums\Crm\MeasurementContext;
use Illuminate\Database\Eloquent\Builder;

final class SiteVisitMeasurementContextFilter
{
    /**
     * @param  Builder<\App\Models\SiteVisit>  $query
     */
    public static function apply(Builder $query, ?string $context): void
    {
        if (! $context) {
            return;
        }

        if ($context === MeasurementContext::Quotation->value) {
            $query->where(function (Builder $inner): void {
                $inner->where('measurement_context', MeasurementContext::Quotation->value)
                    ->orWhereNull('measurement_context');
            });

            return;
        }

        if ($context === MeasurementContext::Production->value) {
            $query->where('measurement_context', MeasurementContext::Production->value);
        }
    }
}

<?php

namespace App\Services\Procurement;

use App\Enums\Procurement\DriverStatus;
use App\Models\Procurement\Driver;
use Illuminate\Validation\ValidationException;

class DriverOccupancyService
{
    public function occupy(Driver $driver, ?string $reason = null): Driver
    {
        $this->assertAvailable($driver);

        $driver->forceFill([
            'status' => DriverStatus::Occupied->value,
        ])->save();

        return $driver->fresh();
    }

    public function release(Driver $driver): Driver
    {
        $driver = $driver->fresh() ?? $driver;

        if ($driver->status === DriverStatus::Inactive) {
            return $driver;
        }

        $driver->forceFill([
            'status' => DriverStatus::Available->value,
            'is_active' => true,
        ])->save();

        return $driver->fresh();
    }

    public function assertAvailable(Driver $driver): void
    {
        $driver = $driver->fresh() ?? $driver;
        $status = $driver->status instanceof DriverStatus
            ? $driver->status
            : DriverStatus::tryFrom((string) $driver->status);

        if ($status === DriverStatus::Available && $driver->is_active) {
            return;
        }

        $label = $status?->value ?? (string) $driver->status;

        throw ValidationException::withMessages([
            'driver_id' => ["Driver is not available (status: {$label})."],
        ]);
    }
}

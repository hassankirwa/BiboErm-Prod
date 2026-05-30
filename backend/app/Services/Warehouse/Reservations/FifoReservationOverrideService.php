<?php

namespace App\Services\Warehouse\Reservations;

use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FifoReservationOverrideService
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * @param  list<int>  $reservationIdsInOrder Lowest priority first, highest last — or document order as displayed queue
     */
    public function reorder(User $user, array $reservationIdsInOrder): void
    {
        if ($reservationIdsInOrder === []) {
            throw new InvalidArgumentException('Reservation order cannot be empty.');
        }

        $reservations = StockReservation::query()
            ->whereIn('id', $reservationIdsInOrder)
            ->get()
            ->keyBy('id');

        if ($reservations->count() !== count(array_unique($reservationIdsInOrder))) {
            throw new InvalidArgumentException('One or more reservations were not found.');
        }

        $before = $reservations->map(fn (StockReservation $r) => [
            'id' => $r->id,
            'fifo_sequence' => $r->fifo_sequence,
        ])->values()->all();

        DB::transaction(function () use ($reservationIdsInOrder, $reservations) {
            foreach ($reservationIdsInOrder as $index => $reservationId) {
                /** @var StockReservation $reservation */
                $reservation = $reservations->get($reservationId);
                $reservation->fifo_sequence = $index + 1;
                $reservation->save();
            }
        });

        $after = StockReservation::query()
            ->whereIn('id', $reservationIdsInOrder)
            ->orderBy('fifo_sequence')
            ->get(['id', 'fifo_sequence'])
            ->map(fn (StockReservation $r) => [
                'id' => $r->id,
                'fifo_sequence' => $r->fifo_sequence,
            ])
            ->values()
            ->all();

        $this->audit->fifoSequenceOverride([
            'performed_by' => $user->id,
            'before' => $before,
            'after' => $after,
        ]);
    }
}

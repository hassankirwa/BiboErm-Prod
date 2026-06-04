<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Resources\Production\ScheduleCalendarResource;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionScheduleService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductionScheduleController extends Controller
{
    public function __construct(
        protected ProductionScheduleService $schedule,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('production.schedule.viewAny');

        return ScheduleCalendarResource::collection(
            $this->schedule->calendarQueue()
        );
    }
}

<?php

use App\Http\Controllers\Crm\Calendar\CrmCalendarController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:activities.view')->get('calendar/events', CrmCalendarController::class);

<?php

use App\Http\Controllers\Workspace\WorkspaceCalendarController;
use App\Http\Controllers\Workspace\WorkspaceCalendarEventController;
use App\Http\Controllers\Workspace\WorkspaceTasksController;
use App\Http\Controllers\Workspace\WorkspaceTodayController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:activities.view|crm.view|site_visits.view|projects.view|field_installation.view|field_day.view')->group(function () {
    Route::get('today', WorkspaceTodayController::class);
    Route::get('tasks', WorkspaceTasksController::class);
    Route::get('calendar/events', WorkspaceCalendarController::class);
});

Route::middleware('permission:activities.view|crm.view')->group(function () {
    Route::post('calendar/events', [WorkspaceCalendarEventController::class, 'store']);
    Route::patch('calendar/events/{workspaceCalendarEvent}', [WorkspaceCalendarEventController::class, 'update']);
    Route::delete('calendar/events/{workspaceCalendarEvent}', [WorkspaceCalendarEventController::class, 'destroy']);
});

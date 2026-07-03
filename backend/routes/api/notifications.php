<?php

use App\Http\Controllers\Notifications\NotificationController;
use Illuminate\Support\Facades\Route;

Route::get('/', [NotificationController::class, 'index']);
Route::get('unread-count', [NotificationController::class, 'unreadCount']);
Route::post('read-all', [NotificationController::class, 'markAllRead']);
Route::post('{notification}/read', [NotificationController::class, 'markRead']);

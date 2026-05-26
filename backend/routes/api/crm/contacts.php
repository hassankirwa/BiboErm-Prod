<?php

use App\Http\Controllers\Crm\Contacts\ContactController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:contacts.view')->get('contacts', [ContactController::class, 'index']);
Route::middleware('permission:contacts.create')->post('contacts', [ContactController::class, 'store']);
Route::middleware('permission:contacts.view')->get('contacts/{contact}', [ContactController::class, 'show']);
Route::middleware('permission:contacts.update')->put('contacts/{contact}', [ContactController::class, 'update']);

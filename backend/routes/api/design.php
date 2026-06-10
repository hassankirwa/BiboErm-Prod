<?php

use App\Http\Controllers\Design\DesignJobController;
use Illuminate\Support\Facades\Route;

$viewDesign = 'projects.view|crm.view|crm.manage';

Route::middleware("permission:{$viewDesign}")->group(function () {
    Route::get('jobs', [DesignJobController::class, 'index']);
    Route::get('jobs/{designJob}', [DesignJobController::class, 'show']);
    Route::post('jobs/{designJob}/assign', [DesignJobController::class, 'assign']);
    Route::post('jobs/{designJob}/download-package', [DesignJobController::class, 'downloadPackage']);
    Route::post('jobs/{designJob}/approve', [DesignJobController::class, 'approve']);
    Route::post('extract', [DesignJobController::class, 'extract']);
});

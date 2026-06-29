<?php

use App\Http\Controllers\SiteOps\MeasurementReportController;
use App\Http\Controllers\SiteOps\SiteVisitController;
use Illuminate\Support\Facades\Route;

$viewSiteVisits = 'site_visits.view|site_visits.view_all|site_visits.execute|field_installation.view|field_installation.log|crm.view';

Route::middleware("permission:{$viewSiteVisits}")->group(function () {
    Route::get('visits', [SiteVisitController::class, 'index']);
    Route::get('visits/{siteVisit}', [SiteVisitController::class, 'show']);

    Route::get('measurement-reports', [MeasurementReportController::class, 'index']);
    Route::get('measurement-reports/{measurementReport}', [MeasurementReportController::class, 'show']);
    Route::get('measurement-reports/{measurementReport}/download', [MeasurementReportController::class, 'download']);
});

<?php

use App\Http\Controllers\Crm\SiteVisits\ApproveSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\SiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\StartSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\StoreMeasurementLinesController;
use App\Http\Controllers\Crm\SiteVisits\StoreSiteVisitPhotoController;
use App\Http\Controllers\Crm\SiteVisits\SubmitSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\OpenAssignedSiteVisitsController;
use App\Http\Controllers\Crm\SiteVisits\TodaySiteVisitsController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:site_visits.view|field_installation.view')->get('site-visits', [SiteVisitController::class, 'index']);
Route::middleware('permission:site_visits.execute|field_installation.view|field_installation.log')->get('site-visits/today', TodaySiteVisitsController::class);
Route::middleware('permission:site_visits.execute|field_installation.view|field_installation.log')->get('site-visits/open', OpenAssignedSiteVisitsController::class);
Route::middleware('permission:site_visits.schedule')->post('site-visits', [SiteVisitController::class, 'store']);
Route::middleware('permission:site_visits.view|field_installation.view')->get('site-visits/{siteVisit}', [SiteVisitController::class, 'show']);
Route::middleware('permission:site_visits.execute|field_installation.log')->post('site-visits/{siteVisit}/start', StartSiteVisitController::class);
Route::middleware('permission:site_visits.execute|field_installation.log')->post('site-visits/{siteVisit}/measurements', StoreMeasurementLinesController::class);
Route::middleware('permission:site_visits.execute|field_installation.log')->post('site-visits/{siteVisit}/submit', SubmitSiteVisitController::class);
Route::middleware('permission:site_visits.approve')->post('site-visits/{siteVisit}/approve', ApproveSiteVisitController::class);
Route::middleware('permission:site_visits.execute|field_installation.log')->post('site-visits/{siteVisit}/photos', StoreSiteVisitPhotoController::class);

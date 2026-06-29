<?php

use App\Http\Controllers\Crm\SiteVisits\ApproveSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\SiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\StartSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\StoreSiteMeasurementSketchController;
use App\Http\Controllers\Crm\SiteVisits\StoreSiteVisitPhotoController;
use App\Http\Controllers\Crm\SiteVisits\SubmitSiteVisitController;
use App\Http\Controllers\Crm\SiteVisits\UpdateSiteMeasurementFormController;
use App\Http\Controllers\Crm\SiteVisits\OpenAssignedSiteVisitsController;
use App\Http\Controllers\Crm\SiteVisits\TodaySiteVisitsController;
use Illuminate\Support\Facades\Route;

// Keep in sync with SiteVisitPolicy::viewAny().
$viewSiteVisits = 'site_visits.view|site_visits.view_all|site_visits.execute|field_installation.view|field_installation.log|crm.view';

// Keep in sync with SiteVisitPolicy::execute() capability checks (assignee enforced in policy).
$executeSiteVisit = 'site_visits.execute|field_installation.log|site_visits.view';

Route::middleware("permission:{$viewSiteVisits}")->get('site-visits', [SiteVisitController::class, 'index']);
Route::middleware("permission:{$viewSiteVisits}")->get('site-visits/today', TodaySiteVisitsController::class);
Route::middleware("permission:{$viewSiteVisits}")->get('site-visits/open', OpenAssignedSiteVisitsController::class);
Route::middleware('permission:site_visits.schedule|crm.manage')->post('site-visits', [SiteVisitController::class, 'store']);
Route::middleware("permission:{$viewSiteVisits}")->get('site-visits/{siteVisit}', [SiteVisitController::class, 'show']);
Route::middleware("permission:{$executeSiteVisit}")->post('site-visits/{siteVisit}/start', StartSiteVisitController::class);
Route::middleware("permission:{$executeSiteVisit}")->patch('site-visits/{siteVisit}/measurement-form', UpdateSiteMeasurementFormController::class);
Route::middleware("permission:{$executeSiteVisit}")->post('site-visits/{siteVisit}/measurement-form/sketch', StoreSiteMeasurementSketchController::class);
Route::middleware("permission:{$executeSiteVisit}")->post('site-visits/{siteVisit}/submit', SubmitSiteVisitController::class);
Route::middleware('permission:site_visits.approve|crm.view|crm.manage')->post('site-visits/{siteVisit}/approve', ApproveSiteVisitController::class);
Route::middleware("permission:{$executeSiteVisit}")->post('site-visits/{siteVisit}/photos', StoreSiteVisitPhotoController::class);

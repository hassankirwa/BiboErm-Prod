<?php

use App\Http\Controllers\Crm\Quotations\AppendQuotationNegotiationNoteController;
use App\Http\Controllers\Crm\Quotations\ReviseQuotationController;
use App\Http\Controllers\Crm\Quotations\ApproveQuotationController;
use App\Http\Controllers\Crm\Quotations\SendQuotationController;
use App\Http\Controllers\Crm\Quotations\SubmitQuotationForReviewController;
use App\Http\Controllers\Projects\DesignChangeOrderController;
use App\Http\Controllers\Projects\ProjectBomController;
use App\Http\Controllers\Projects\ProjectController;
use App\Http\Controllers\Projects\ProjectDesignController;
use App\Http\Controllers\Projects\ProjectDispatchController;
use App\Http\Controllers\Projects\ProjectDocumentController;
use App\Http\Controllers\Projects\ProjectOperationsController;
use App\Http\Controllers\Projects\ProjectQuotationWorkspaceController;
use App\Http\Controllers\Projects\ProjectSiteAssessmentController;
use App\Http\Controllers\Projects\ScheduleProjectMeasurementVisitController;
use Illuminate\Support\Facades\Route;

Route::post('project-dispatches/{projectDispatch}/delivered', [ProjectDispatchController::class, 'markDelivered']);

Route::get('design-change-orders/{dco}', [DesignChangeOrderController::class, 'show']);
Route::patch('design-change-orders/{dco}', [DesignChangeOrderController::class, 'update']);
Route::post('design-change-orders/{dco}/approve', [DesignChangeOrderController::class, 'approve']);
Route::post('design-change-orders/{dco}/release-to-production', [DesignChangeOrderController::class, 'releaseToProduction']);
Route::post('design-change-orders/{dco}/create-remake', [DesignChangeOrderController::class, 'createRemake']);
Route::post('design-change-orders/{dco}/complete-minor', [DesignChangeOrderController::class, 'completeMinor']);
Route::post('design-change-orders/{dco}/close', [DesignChangeOrderController::class, 'close']);

Route::get('dashboard', [ProjectController::class, 'dashboard']);
Route::get('pipeline', [ProjectController::class, 'pipeline']);
Route::get('material-shortages', [ProjectOperationsController::class, 'materialShortages']);
Route::get('/', [ProjectController::class, 'index']);
Route::post('/', [ProjectController::class, 'store']);

Route::prefix('design')->group(function () {
    Route::get('queue', [ProjectDesignController::class, 'queue']);
    Route::get('pending', [ProjectDesignController::class, 'pending']);
    Route::post('extract', [ProjectDesignController::class, 'extract']);
});

Route::prefix('quotations')->group(function () {
    Route::get('pending', [ProjectQuotationWorkspaceController::class, 'pending']);
    Route::get('form-accounts', [ProjectQuotationWorkspaceController::class, 'formAccounts']);
    Route::post('extract', [ProjectQuotationWorkspaceController::class, 'extract']);
    Route::post('fabrication-from-account/{account}', [ProjectQuotationWorkspaceController::class, 'fabricationFromAccount']);
    Route::post('generate-from-account/{account}', [ProjectQuotationWorkspaceController::class, 'generateFromAccount']);
    Route::post('extract-from-account/{account}', [ProjectQuotationWorkspaceController::class, 'extractFromAccount']);
    Route::get('/', [ProjectQuotationWorkspaceController::class, 'index']);
    Route::post('/', [ProjectQuotationWorkspaceController::class, 'store']);
    Route::get('{quotation}', [ProjectQuotationWorkspaceController::class, 'show']);
    Route::patch('{quotation}', [ProjectQuotationWorkspaceController::class, 'update']);
    Route::get('{quotation}/preview', [ProjectQuotationWorkspaceController::class, 'preview']);
    Route::middleware('permission:quotations.create')->post('{quotation}/submit-for-review', SubmitQuotationForReviewController::class);
    Route::middleware('permission:quotations.approve|quotations.send|crm.manage')->post('{quotation}/approve', ApproveQuotationController::class);
    Route::middleware('permission:quotations.send|quotations.approve')->post('{quotation}/send', SendQuotationController::class);
    Route::middleware('permission:quotations.create')->post('{quotation}/negotiation-notes', AppendQuotationNegotiationNoteController::class);
    Route::middleware('permission:quotations.create')->post('{quotation}/revise', ReviseQuotationController::class);
});

Route::prefix('{project}')->group(function () {
    Route::get('/', [ProjectController::class, 'show']);
    Route::patch('/', [ProjectController::class, 'update']);
    Route::post('assign-pm', [ProjectController::class, 'assignProjectManager']);
    Route::post('advance-stage', [ProjectController::class, 'advanceStage']);
    Route::post('dispatch', [ProjectDispatchController::class, 'store']);
    Route::get('dispatches', [ProjectDispatchController::class, 'index']);
    Route::get('design-change-orders', [DesignChangeOrderController::class, 'index']);
    Route::post('design-change-orders', [DesignChangeOrderController::class, 'store']);
    Route::patch('site-assessment-notes', [ProjectController::class, 'updateSiteAssessmentNotes']);
    Route::post('measurement-visits', ScheduleProjectMeasurementVisitController::class);
    Route::get('measurement-visits', [ProjectController::class, 'measurementVisits']);
    Route::post('site-assessment/images', [ProjectSiteAssessmentController::class, 'storeImage']);
    Route::delete('site-assessment/images', [ProjectSiteAssessmentController::class, 'destroyImage']);
    Route::get('timeline', [ProjectController::class, 'timeline']);

    Route::get('bom', [ProjectBomController::class, 'show']);
    Route::get('bom/export', [ProjectBomController::class, 'export']);
    Route::post('bom/extract', [ProjectBomController::class, 'extract']);
    Route::post('bom/import', [ProjectBomController::class, 'import']);
    Route::post('bom', [ProjectBomController::class, 'store']);
    Route::patch('bom/lines/{line}', [ProjectBomController::class, 'updateLine']);
    Route::post('finalize-bom', [ProjectBomController::class, 'finalize']);

    Route::get('documents', [ProjectDocumentController::class, 'index']);
    Route::post('documents', [ProjectDocumentController::class, 'store']);
    Route::patch('documents/{document}', [ProjectDocumentController::class, 'update']);
    Route::get('documents/{document}/download', [ProjectDocumentController::class, 'download']);
    Route::post('designs/fabrication', [ProjectDesignController::class, 'importFabrication']);

    Route::get('material-status', [ProjectOperationsController::class, 'materialStatus']);
    Route::post('reserve-materials', [ProjectOperationsController::class, 'reserveMaterials']);
    Route::post('adjust-reservation', [ProjectOperationsController::class, 'adjustReservation']);
    Route::post('delays', [ProjectOperationsController::class, 'storeDelay']);
    Route::get('floors', [ProjectOperationsController::class, 'floors']);
    Route::post('floors', [ProjectOperationsController::class, 'storeFloor']);
    Route::get('engineers', [ProjectOperationsController::class, 'engineers']);
    Route::post('engineers', [ProjectOperationsController::class, 'storeEngineer']);
    Route::delete('engineers/{engineer}', [ProjectOperationsController::class, 'destroyEngineer']);
    Route::post('addons', [ProjectOperationsController::class, 'addAddon']);
});

<?php

use App\Http\Controllers\Procurement\Addons\ProjectAddonRequestController;
use App\Http\Controllers\Procurement\Dashboard\ProcurementDashboardController;
use App\Http\Controllers\Procurement\Delays\ProcurementDelayController;
use App\Http\Controllers\Procurement\GlassOrders\GlassOrderController;
use App\Http\Controllers\Procurement\GlassOrders\MarkGlassOrderDeliveredController;
use App\Http\Controllers\Procurement\GlassOrders\MarkGlassOrderOrderedController;
use App\Http\Controllers\Procurement\GoodsReceipts\GoodsReceiptAttachmentController;
use App\Http\Controllers\Procurement\GoodsReceipts\GoodsReceiptController;
use App\Http\Controllers\Procurement\GoodsReceipts\UpdateGoodsReceiptLinesController;
use App\Http\Controllers\Procurement\GoodsReceipts\VerifyGoodsReceiptController;
use App\Http\Controllers\Procurement\PurchaseOrders\ApprovePurchaseOrderController;
use App\Http\Controllers\Procurement\PurchaseOrders\BatchPurchaseOrderController;
use App\Http\Controllers\Procurement\PurchaseOrders\PurchaseOrderDraftController;
use App\Http\Controllers\Procurement\PurchaseOrders\PurchaseOrderPdfController;
use App\Http\Controllers\Procurement\PurchaseOrders\PurchaseOrderController;
use App\Http\Controllers\Procurement\PurchaseOrders\SendPurchaseOrderController;
use App\Http\Controllers\Procurement\Requisitions\ApprovePurchaseRequisitionController;
use App\Http\Controllers\Procurement\Requisitions\PurchaseRequisitionController;
use App\Http\Controllers\Procurement\Requisitions\PurchaseRequisitionPdfController;
use App\Http\Controllers\Procurement\Requisitions\RequisitionSourceController;
use App\Http\Controllers\Procurement\Requisitions\RejectPurchaseRequisitionController;
use App\Http\Controllers\Procurement\Requisitions\SubmitPurchaseRequisitionController;
use App\Http\Controllers\Procurement\Stock\ProcurementStockController;
use App\Http\Controllers\Procurement\Drivers\DriverController;
use App\Http\Controllers\Procurement\Suppliers\SupplierController;
use App\Http\Controllers\Procurement\Suppliers\SupplierItemPriceController;
use App\Http\Controllers\Procurement\Transport\TransportOrderController;
use App\Http\Controllers\Procurement\Watchers\ProcurementProjectWatcherController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:procurement.requisition.view|procurement.view')->get('requisitions', [PurchaseRequisitionController::class, 'index']);
Route::middleware('permission:procurement.requisition.view|procurement.view')->get('requisitions/{requisition}', [PurchaseRequisitionController::class, 'show']);
Route::middleware('permission:procurement.requisition.view|procurement.view')
    ->get('requisitions/{requisition}/pdf', PurchaseRequisitionPdfController::class)
    ->name('procurement.requisitions.pdf');
Route::middleware('permission:procurement.requisition.create|procurement.manage')->post('requisitions', [PurchaseRequisitionController::class, 'store']);
Route::middleware('permission:procurement.requisition.update|procurement.manage')->patch('requisitions/{requisition}', [PurchaseRequisitionController::class, 'update']);
Route::middleware('permission:procurement.requisition.create|procurement.manage')->post('requisitions/{requisition}/submit', SubmitPurchaseRequisitionController::class);
Route::middleware('permission:procurement.requisition.approve|procurement.approve')->post('requisitions/{requisition}/approve', ApprovePurchaseRequisitionController::class);
Route::middleware('permission:procurement.requisition.approve|procurement.approve')->post('requisitions/{requisition}/reject', RejectPurchaseRequisitionController::class);
Route::middleware('permission:procurement.requisition.create|procurement.manage')->get('requisition-sources/low-stock', [RequisitionSourceController::class, 'lowStock']);
Route::middleware('permission:procurement.requisition.create|procurement.manage')->post('requisition-sources/low-stock/requisitions', [RequisitionSourceController::class, 'storeLowStock']);
Route::middleware('permission:procurement.requisition.create|procurement.manage')->post('requisition-sources/project-materials/requisitions', [RequisitionSourceController::class, 'storeProjectMaterials']);

Route::middleware('permission:procurement.po.view|procurement.view')->get('purchase-orders', [PurchaseOrderController::class, 'index']);
Route::middleware('permission:procurement.po.create|procurement.manage')->get('purchase-orders/draft', PurchaseOrderDraftController::class);
Route::middleware('permission:procurement.po.create|procurement.manage')->post('purchase-orders/batch', BatchPurchaseOrderController::class);
Route::middleware('permission:procurement.po.view|procurement.view')->get('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
Route::middleware('permission:procurement.po.view|procurement.view')->get('purchase-orders/{purchaseOrder}/pdf', PurchaseOrderPdfController::class);
Route::middleware('permission:procurement.po.create|procurement.manage')->post('purchase-orders', [PurchaseOrderController::class, 'store']);
Route::middleware('permission:procurement.po.update|procurement.manage')->patch('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update']);
Route::middleware('permission:procurement.po.approve|procurement.approve')->post('purchase-orders/{purchaseOrder}/approve', ApprovePurchaseOrderController::class);
Route::middleware('permission:procurement.po.send|procurement.manage')->post('purchase-orders/{purchaseOrder}/send', SendPurchaseOrderController::class);

Route::middleware('permission:procurement.grn.view|procurement.view|warehouse.stock.view|warehouse.stock.receive')->get('goods-receipts', [GoodsReceiptController::class, 'index']);
Route::middleware('permission:procurement.grn.view|procurement.view|warehouse.stock.view|warehouse.stock.receive')->get('goods-receipts/{goodsReceipt}', [GoodsReceiptController::class, 'show']);
Route::middleware('permission:procurement.grn.create|procurement.manage|warehouse.stock.receive')->post('goods-receipts', [GoodsReceiptController::class, 'store']);
Route::middleware('permission:procurement.grn.verify|procurement.manage|warehouse.stock.receive')->patch('goods-receipts/{goodsReceipt}/lines', UpdateGoodsReceiptLinesController::class);
Route::middleware('permission:procurement.grn.verify|procurement.manage|warehouse.stock.receive')->post('goods-receipts/{goodsReceipt}/attachments', GoodsReceiptAttachmentController::class);
Route::middleware('permission:procurement.grn.verify|procurement.manage|warehouse.stock.receive')->post('goods-receipts/{goodsReceipt}/verify', VerifyGoodsReceiptController::class);

Route::middleware('permission:procurement.glass.view|procurement.view')->get('glass-orders', [GlassOrderController::class, 'index']);
Route::middleware('permission:procurement.glass.view|procurement.view')->get('glass-orders/{glassOrder}', [GlassOrderController::class, 'show']);
Route::middleware('permission:procurement.glass.manage|procurement.manage')->post('glass-orders', [GlassOrderController::class, 'store']);
Route::middleware('permission:procurement.glass.manage|procurement.manage')->patch('glass-orders/{glassOrder}', [GlassOrderController::class, 'update']);
Route::middleware('permission:procurement.glass.manage|procurement.manage')->post('glass-orders/{glassOrder}/mark-ordered', MarkGlassOrderOrderedController::class);
Route::middleware('permission:procurement.glass.manage|procurement.manage')->post('glass-orders/{glassOrder}/mark-delivered', MarkGlassOrderDeliveredController::class);

Route::middleware('permission:procurement.driver.view|procurement.view')->get('drivers', [DriverController::class, 'index']);
Route::middleware('permission:procurement.driver.manage|procurement.manage')->get('drivers/suggested-code', [DriverController::class, 'suggestedCode']);
Route::middleware('permission:procurement.driver.manage|procurement.manage')->post('drivers', [DriverController::class, 'store']);
Route::middleware('permission:procurement.driver.view|procurement.view')->get('drivers/{driver}', [DriverController::class, 'show']);
Route::middleware('permission:procurement.driver.manage|procurement.manage')->patch('drivers/{driver}', [DriverController::class, 'update']);

Route::middleware('permission:procurement.supplier.view|procurement.view')->get('suppliers', [SupplierController::class, 'index']);
Route::middleware('permission:procurement.supplier.manage|procurement.manage')->get('suppliers/suggested-code', [SupplierController::class, 'suggestedCode']);
Route::middleware('permission:procurement.supplier.manage|procurement.manage')->post('suppliers', [SupplierController::class, 'store']);
Route::middleware('permission:procurement.supplier.view|procurement.view')->get('suppliers/{supplier}', [SupplierController::class, 'show']);
Route::middleware('permission:procurement.supplier.manage|procurement.manage')->patch('suppliers/{supplier}', [SupplierController::class, 'update']);
Route::middleware('permission:procurement.supplier.manage|procurement.manage')->get('suppliers/{supplier}/prices', [SupplierItemPriceController::class, 'index']);
Route::middleware('permission:procurement.supplier.manage|procurement.manage')->post('suppliers/{supplier}/prices', [SupplierItemPriceController::class, 'store']);

Route::middleware('permission:procurement.transport.manage|procurement.manage')->get('transport', [TransportOrderController::class, 'index']);
Route::middleware('permission:procurement.transport.manage|procurement.manage')->post('transport', [TransportOrderController::class, 'store']);
Route::middleware('permission:procurement.transport.manage|procurement.manage')->patch('transport/{transportOrder}/status', [TransportOrderController::class, 'updateStatus']);

Route::middleware('permission:procurement.view|procurement.manage')->get('stock', [ProcurementStockController::class, 'index']);
Route::middleware('permission:procurement.view|procurement.manage')->get('stock/analytics', [ProcurementStockController::class, 'analytics']);

Route::middleware('permission:procurement.delay.log|procurement.manage')->get('delays', [ProcurementDelayController::class, 'index']);
Route::middleware('permission:procurement.delay.log|procurement.manage')->post('delays', [ProcurementDelayController::class, 'store']);

Route::middleware('permission:procurement.watcher.manage|procurement.manage')->get('project-watchers', [ProcurementProjectWatcherController::class, 'index']);
Route::middleware('permission:procurement.watcher.manage|procurement.manage')->post('project-watchers', [ProcurementProjectWatcherController::class, 'store']);

Route::middleware('permission:procurement.requisition.view|procurement.view')->get('addon-requests', [ProjectAddonRequestController::class, 'index']);

Route::middleware('permission:procurement.dashboard.view|procurement.view')->get('dashboard', ProcurementDashboardController::class);

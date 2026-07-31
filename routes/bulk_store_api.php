<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Purchases\RequisitionController;
use App\Http\Controllers\BulkStores\BulkStoreSettingController;

Route::prefix('v1/bulk-store')->group(function () {
    // Existing routes
    Route::get('/product/search/{barcode}', [\App\Http\Controllers\BulkStores\ProductController::class, 'searchProduct']);
    Route::get('/product/{id}', [\App\Http\Controllers\BulkStores\ProductController::class, 'getProduct']);
    Route::put('/product/{id}', [\App\Http\Controllers\BulkStores\ProductController::class, 'updateProduct']);
    Route::get('/requisition/budget/check-balance/{budget}/{amount}', [RequisitionController::class, 'checkBudget']);
    Route::post('purchase/requisition/create', [RequisitionController::class, 'createRequisition']);
        Route::post('/adjust-stock', [\App\Http\Controllers\BulkStores\ProductController::class,'stockAdjustment']);
    Route::get('/purchase-orders', [RequisitionController::class, 'getRequisitions']);
    Route::get('/requisitions', [RequisitionController::class, 'getRequisitions']);
    Route::get('/purchase-orders/{id}',[\App\Http\Controllers\Bulkstores\PurchaseOrderController::class,'index']);
    Route::post('/purchase-orders/{authorityId}/authorize',[RequisitionController::class,'approveRequisition']);
    // Optional: Add these if you need them
    Route::get('/requisition/{id}', [RequisitionController::class, 'getRequisition']);
    Route::put('/requisition/{id}', [RequisitionController::class, 'updateRequisition']);
    Route::delete('/requisition/{id}', [RequisitionController::class, 'deleteRequisition']);
    Route::post('/requisition/{id}/approve', [RequisitionController::class, 'approveRequisition']);
    Route::post('/requisition/{id}/reject', [RequisitionController::class, 'rejectRequisition']);
})->middleware(['auth','verified']);


// Bulk Store Settings Routes
Route::prefix('settings/bulkstore')->group(function () {
    Route::get('/', [BulkStoreSettingController::class, 'index']);
    Route::get('/section/{section}', [BulkStoreSettingController::class, 'getSection']);
    Route::put('/', [BulkStoreSettingController::class, 'update']);
    Route::post('/reset', [BulkStoreSettingController::class, 'reset']);
});


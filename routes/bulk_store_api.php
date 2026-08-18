<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Purchases\RequisitionController;
use App\Http\Controllers\BulkStores\BulkStoreSettingController;
use App\Http\Controllers\BulkStores\PurchaseRequisitionController;
use App\Http\Controllers\BulkStores\PurchaseOrderController;
use App\Http\Controllers\BulkStores\StockPricingController;
use App\Http\Controllers\BulkStores\GoodsReceivedNoteController; 

Route::prefix('v1/bulk-store')->group(function () {
    //verify 
    Route::post('/{otp}/verify-token',[GoodsReceivedNoteController::class,'verifyOtp']);
    Route::prefix('/{userId}/')->group(function () {
        Route::post('/verify-approval-code', [GoodsReceivedNoteController::class, 'authorizeApprovalCode']);
    });
    // GRN Routes
    Route::prefix('grns')->group(function () {
        // GET routes
        Route::get('/', [GoodsReceivedNoteController::class, 'index']);
        Route::get('/stats', [GoodsReceivedNoteController::class, 'stats']);
        Route::get('/by-requisition/{requisitionId}', [GoodsReceivedNoteController::class, 'getByRequisition']);
        Route::get('/by-number/{grnNumber}', [GoodsReceivedNoteController::class, 'getByNumber']);
        Route::get('/{id}', [GoodsReceivedNoteController::class, 'show']);
        Route::get('/{id}/print', [GoodsReceivedNoteController::class, 'printGrn']);

        // POST routes
        Route::post('/generate-from-receiving', [GoodsReceivedNoteController::class, 'generateFromReceiving']);
        Route::post('/{id}/approve', [GoodsReceivedNoteController::class, 'approve']);
        Route::post('/{id}/reject', [GoodsReceivedNoteController::class, 'reject']);

        // PUT/PATCH routes
        Route::put('/{id}', [GoodsReceivedNoteController::class, 'update']);
        Route::patch('/{id}', [GoodsReceivedNoteController::class, 'update']);

        // DELETE routes
        Route::delete('/{id}', [GoodsReceivedNoteController::class, 'destroy']);
    });
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
    //show items to be received 
    Route::get('/purchase-requisitions/approved', [PurchaseOrderController::class, 'approvedPurchaseRequesition'])->name('purchase-requisition');
    Route::post('/receiving', [\App\Http\Controllers\BulkStores\ReceivingController::class, 'receiveProduct']);
    Route::post('/returns',[\App\Http\Controllers\BulkStores\ReturningController::class,'returnProduct']);

    // GET - Return history with filters
    Route::get('/returns/history', [\App\Http\Controllers\BulkStores\ReturningController::class, 'getReturnHistory']);
    // Route::get('/grns/by-requisition/{requisitionId}', [\App\Http\Controllers\BulkStores\GoodsReceivedNoteController::class, 'getByRequisition']);
    /**
     * Stock Pricing 
     */
    Route::get('/products/all', [StockPricingController::class, 'getProducts']);

})->middleware(['auth','verified']);


// Bulk Store Settings Routes
Route::prefix('settings/bulkstore')->group(function () {
    Route::get('/', [BulkStoreSettingController::class, 'index']);
    Route::get('/section/{section}', [BulkStoreSettingController::class, 'getSection']);
    Route::put('/', [BulkStoreSettingController::class, 'update']);
    Route::post('/reset', [BulkStoreSettingController::class, 'reset']);
});


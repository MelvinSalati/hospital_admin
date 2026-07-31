<?php 

use App\Http\Controllers\Admin\AdminController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/admin')->group( function (){
    Route::get('/all-users',[AdminController::class, 'getSystemUsers']);
    Route::get("/all-budgets",[AdminController::class, 'getBudgets']);
    Route::get("/purchase-orders",[AdminController::class,'getPurchaseRequisitions']);
    Route::post("/purchase-requisition/{requisitionId}/approve",[AdminController::class,'approveRequisition']);
    Route::post('/purchase-requisition/{requisitionId}/rejected',[AdminController::class,'rejectRequisition']);
       Route::get('/system-users', [AdminController::class, 'getSystemUsers']);
    Route::get('/budgets', [AdminController::class, 'getBudgets']);
    Route::get('/purchase-orders', [AdminController::class, 'getPurchaseRequisitions']);
    Route::get('/purchase-orders/approved', [AdminController::class, 'getPurchaseOrders']);
    // New budget and requisition routes
    Route::get('/purchase-requisition/{id}/check-budget', [AdminController::class, 'checkBudget']);
    Route::post('/purchase-requisition/{id}/approve', [AdminController::class, 'approveRequisition']);
    Route::post('/purchase-requisition/{id}/reject', [AdminController::class, 'rejectRequisition']);
    Route::post('/purchase-order/{id}/release-funds', [AdminController::class, 'releaseFunds']);
});



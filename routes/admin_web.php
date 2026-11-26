<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Dashboards\AdminDashboardController;
use App\Http\Controllers\Budgets\BudgetTransactionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'dashboard'])->name('admin.dashboard');
    Route::inertia('/approvals', 'admin/Approvals');
    Route::get('/purchase-requisitions', [AdminController::class, 'getPurchaseRequisitions'])->name('admin.purchase-requisitions');
    Route::inertia('/purchase-orders', 'admin/PurchaseOrders');
  
    Route::inertia('settings', 'admin/Settings');
    Route::inertia('/budgets', 'admin/Budget');
    Route::inertia('/inventory', 'admin/Dashboard');
    Route::inertia('/manage-users', 'admin/Users');
    Route::inertia('/reports', 'admin/Reports');
    Route::inertia("/administration", 'admin/Administration');
    Route::inertia('/settings', 'admin/Settings');
    Route::get('/departments/collections/{departmentId}', [AdminController::class, 'getDepartmentCollections']);
});



Route::middleware(['auth'])->prefix('v1/admin')->group(function () {
    Route::get('budget-transactions', [BudgetTransactionController::class, 'index']);
    Route::post('budget-transactions', [BudgetTransactionController::class, 'store']);
    Route::get('budget-transactions/{id}', [BudgetTransactionController::class, 'show']);
    Route::post('budget-transactions/{id}/approve', [BudgetTransactionController::class, 'approve']);
    Route::post('budget-transactions/{id}/reject', [BudgetTransactionController::class, 'reject']);
    Route::delete('budget-transactions/{id}', [BudgetTransactionController::class, 'destroy']);

    /**
     * Finacess
     */

    // Route::get('finances', [])
});

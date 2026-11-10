<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Dashboards\AdminDashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::prefix('admin')->group(function () {
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
})->middleware(['auth', 'verified']);

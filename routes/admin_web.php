<?php 


use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
Route::prefix('admin')->group(function (){
    Route::inertia('/dashboard','admin/Dashboard');
    Route::inertia('/approvals','admin/Approvals');
    Route::inertia('/purchase-requisitions','admin/PurchaseRequisitions');
      Route::inertia('/purchase-orders','admin/PurchaseOrders');
    Route::inertia('settings','admin/Settings');
    Route::inertia('/budgets','admin/Budget');
    Route::inertia('/inventory','admin/Dashboard');
    Route::inertia('/manage-users','admin/Users');
})->middleware(['auth','verified']);
<?php

use App\Http\Controllers\BulkStores\BulkStoreController;
use App\Http\Controllers\BulkStores\DepartmentController;
use App\Http\Controllers\BulkStores\PurchaseOrderController;
use App\Http\Controllers\BulkStores\StockMovementController;
use App\Http\Controllers\BulkStores\SupplierController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Bulk Store / Central Pharmacy Routes
|--------------------------------------------------------------------------
| Register in routes/api.php:
|
|   require base_path('routes/bulk_stores.php');
|
| All routes are auth-guarded. Apply additional middleware (role/permission)
| inside each group as needed for your auth package (Spatie, etc.).
|--------------------------------------------------------------------------
*/

// Route::middleware(['auth:sanctum'])->prefix('api/v1')->name('bulk-stores.')->group(function () {

//     // ------------------------------------------------------------------
//     // Bulk Stores
//     // ------------------------------------------------------------------
//     Route::apiResource('bulk-stores', BulkStoreController::class);

//     // ------------------------------------------------------------------
//     // Departments
//     // ------------------------------------------------------------------
//     Route::apiResource('departments', DepartmentController::class);

//     // ------------------------------------------------------------------
//     // Suppliers
//     // ------------------------------------------------------------------
//     Route::apiResource('suppliers', SupplierController::class);

//     // ------------------------------------------------------------------
//     // Stock Movements  (list + individual transaction endpoints)
//     // ------------------------------------------------------------------
//     Route::prefix('stock-movements')->name('movements.')->group(function () {

//         // Audit log (read-only)
//         Route::get('/',          [StockMovementController::class, 'index'])->name('index');
//         Route::get('/{stockMovement}', [StockMovementController::class, 'show'])->name('show');

//         // Write operations – each maps to a StockService method
//         Route::post('/receive',  [StockMovementController::class, 'receive'])->name('receive');
//         Route::post('/issue',    [StockMovementController::class, 'issue'])->name('issue');
//         Route::post('/transfer', [StockMovementController::class, 'transfer'])->name('transfer');
//         Route::post('/adjust',   [StockMovementController::class, 'adjust'])->name('adjust');
//     });

//     // ------------------------------------------------------------------
//     // Purchase Orders
//     // ------------------------------------------------------------------
//     Route::prefix('purchase-orders')->name('purchase-orders.')->group(function () {
//         Route::get('/',                               [PurchaseOrderController::class, 'index'])->name('index');
//         Route::post('/',                              [PurchaseOrderController::class, 'store'])->name('store');
//         Route::get('/{purchaseOrder}',                [PurchaseOrderController::class, 'show'])->name('show');
//         Route::delete('/{purchaseOrder}',             [PurchaseOrderController::class, 'destroy'])->name('destroy');

//         // Status transitions
//         Route::post('/{purchaseOrder}/approve',       [PurchaseOrderController::class, 'approve'])->name('approve');
//         Route::post('/{purchaseOrder}/receive',       [PurchaseOrderController::class, 'receive'])->name('receive');
//     });
// });

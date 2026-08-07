<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\BulkStores\ProductController;
use App\Http\Controllers\BulkStores\PurchaseRequisitionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
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


Route::middleware(['auth', 'verified'])
    ->prefix('bulkstore')
    ->name('bulkstore.')
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */
        Route::inertia('/dashboard', 'bulkstore/Dashboard')->name('dashboard');

        /*
        |--------------------------------------------------------------------------
        | Inventory
        |--------------------------------------------------------------------------
        */
        Route::inertia('/products', 'bulkstore/Products')->name('products');
        Route::inertia('/stock', 'bulkstore/Stock')->name('stock');
        Route::inertia('/batches', 'bulkstore/Batches')->name('batches');
        Route::inertia('/expiry', 'bulkstore/Expiry')->name('expiry');
        Route::inertia('/stock-pricing', 'bulkstore/StockPricing')->name('stock-pricing');

        /*
        |---------------------------------------------------------------------------
        | Purchase Requisitions
        |
        |*/

        Route::get('/purchase-requisition',[PurchaseRequisitionController::class, 'purchaseRequesition'])->name('purchase-requisition');
    Route::get('/purchase-requisitions/approved', [PurchaseRequisitionController::class, 'approvedPurchaseRequesition'])->name('purchase-requisition');
        Route::get('/purchase-orders/', [AdminController::class, 'getPurchaseRequisitions']);
        Route::inertia('/purchase-requisition/{requisitionId}', 'bulkstore/PurchaseRequisitionView')->name('purchase.view');

        /*
        |--------------------------------------------------------------------------
        | Stock Transactions
        |--------------------------------------------------------------------------
        */
        Route::inertia('/receive', 'bulkstore/Receive')->name('receive');
        Route::get('/receive/product/{uuid}', [ProductController::class,'receiveProduct'])->name('receive.product');
        Route::inertia('/issue', 'bulkstore/Issue')->name('issue');
        Route::inertia('/transfer', 'bulkstore/Transfer')->name('transfer');
        Route::inertia('/adjustments', 'bulkstore/Adjustments')->name('adjustments');
        Route::inertia('/returns', 'bulkstore/Returns')->name('returns');

        /*
        |--------------------------------------------------------------------------
        | Procurement
        |--------------------------------------------------------------------------
        */
        Route::inertia('/purchase-orders', 'bulkstore/PurchaseOrders')
            ->name('purchase-orders');

        Route::inertia('/purchase-orders/create', 'bulkstore/PurchaseOrderCreate')
            ->name('purchase-orders.create');

        Route::inertia('/purchase-orders/{purchaseOrder}', 'bulkstore/PurchaseOrderView')
            ->name('purchase-orders.show');
    // POST - Return products
    Route::post('/returns', [\App\Http\Controllers\BulkStores\ReturningController::class, 'returnProduct']);
 /*
        |--------------------------------------------------------------------------
        | Suppliers
        |--------------------------------------------------------------------------
        */
        Route::inertia('/suppliers', 'bulkstore/Suppliers')->name('suppliers');

        /*
        |--------------------------------------------------------------------------
        | Departments / Issue Destinations
        |--------------------------------------------------------------------------
        */
        Route::inertia('/departments', 'bulkstore/Departments')->name('departments');

        /*
        |--------------------------------------------------------------------------
        | Physical Stock Counts
        |--------------------------------------------------------------------------
        */
        Route::inertia('/barcode-manage', 'bulkstore/BarcodeManage')
            ->name('barcode-manage');

        /*
        |--------------------------------------------------------------------------
        | Reports
        |--------------------------------------------------------------------------
        */
        Route::inertia('/reports', 'bulkstore/Reports')->name('reports');

        Route::inertia('/reports/stock-levels', 'bulkstore/reports/StockLevels')
            ->name('reports.stock-levels');

        Route::inertia('/reports/movements', 'bulkstore/reports/StockMovements')
            ->name('reports.movements');

        Route::inertia('/reports/consumption', 'bulkstore/reports/Consumption')
            ->name('reports.consumption');

        Route::inertia('/reports/expiry', 'bulkstore/reports/Expiry')
            ->name('reports.expiry');

        /*
        |--------------------------------------------------------------------------
        | Audit
        |--------------------------------------------------------------------------
        */
        Route::inertia('/audit-trail', 'bulkstore/AuditTrail')
            ->name('audit');

        /*
        |--------------------------------------------------------------------------
        | Settings
        |--------------------------------------------------------------------------
        */
        Route::inertia('/module-settings', 'bulkstore/Settings')
            ->name('settings');
    });

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

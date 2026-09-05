<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\BulkStores\ProductController;
use App\Http\Controllers\BulkStores\PurchaseRequisitionController;
use App\Http\Controllers\BulkStores\GoodsReceivedNoteController;
use App\Http\Controllers\BulkStores\BulkStoreController;
use App\Http\Controllers\BulkStores\SupplierController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Bulk Store / Central Pharmacy Routes
|--------------------------------------------------------------------------
| Register in routes/web.php:
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
        | Dashboard - Using Controller for dynamic data
        |--------------------------------------------------------------------------
        */
        Route::get('/dashboard', [BulkStoreController::class, 'index'])->name('dashboard');
        Route::get('/dashboard/refresh', [BulkStoreController::class, 'refreshDashboard'])->name('dashboard.refresh');

        /*
        |--------------------------------------------------------------------------
        | Inventory
        |--------------------------------------------------------------------------
        */
        Route::get('/products',[ProductController::class,'showProducts']);
        Route::inertia('/stock', 'bulkstore/Stock')->name('stock');
        Route::inertia('/batches', 'bulkstore/Batches')->name('batches');
        Route::get('/expiry', [ProductController::class,'getExpiry']);
        Route::get('/stock-pricing', [ProductController::class,'getStockPricing']);

        /*
        |--------------------------------------------------------------------------
        | Purchase Requisitions
        |--------------------------------------------------------------------------
        */
        Route::get('/purchase-requisition', [PurchaseRequisitionController::class, 'purchaseRequesition'])->name('purchase-requisition');
        Route::get('/purchase-requisitions/approved', [PurchaseRequisitionController::class, 'approvedPurchaseRequesition'])->name('purchase-requisition.approved');
        Route::get('/purchase-orders/', [AdminController::class, 'getPurchaseRequisitions'])->name('purchase-orders.list');
        Route::inertia('/purchase-requisition/{requisitionId}', 'bulkstore/PurchaseRequisitionView')->name('purchase.view');

        /*
        |--------------------------------------------------------------------------
        | Stock Transactions
        |--------------------------------------------------------------------------
        */
        Route::inertia('/receive', 'bulkstore/Receive')->name('receive');
        Route::get('/receive/product/{uuid}', [ProductController::class, 'receiveProduct'])->name('receive.product');
        Route::inertia('/issue', 'bulkstore/Issue')->name('issue');
        Route::inertia('/transfer', 'bulkstore/Transfer')->name('transfer');
        Route::get('/adjustments', [ProductController::class,'adjustedProducts']);
        Route::inertia('/returns', 'bulkstore/Returns')->name('returns');

        /*
        |--------------------------------------------------------------------------
        | Procurement
        |--------------------------------------------------------------------------
        */
        Route::inertia('/purchase-orders', 'bulkstore/PurchaseOrders')->name('purchase-orders');
        Route::inertia('/purchase-orders/create', 'bulkstore/PurchaseOrderCreate')->name('purchase-orders.create');
        Route::inertia('/purchase-orders/{purchaseOrder}', 'bulkstore/PurchaseOrderView')->name('purchase-orders.show');

        // POST - Return products
        Route::post('/returns', [\App\Http\Controllers\BulkStores\ReturningController::class, 'returnProduct'])->name('returns.store');

        /*
        |--------------------------------------------------------------------------
        | Goods Received Note
        |--------------------------------------------------------------------------
        */
        Route::inertia('/goods-received-note', 'bulkstore/GoodsRecievedNote')->name('goods-received-note');
        Route::get('/grn/approve/{grnCode}', [GoodsReceivedNoteController::class, 'approveGRN'])->name('grn.approve');

        /*
        |--------------------------------------------------------------------------
        | Suppliers
        |--------------------------------------------------------------------------
        */
        Route::get('/suppliers', [SupplierController::class,'index'])->name('suppliers');

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
        Route::inertia('/barcode-manage', 'bulkstore/BarcodeManage')->name('barcode-manage');

        /*
        |--------------------------------------------------------------------------
        | Reports
        |--------------------------------------------------------------------------
        */
        Route::inertia('/reports', 'bulkstore/Reports')->name('reports');
        Route::inertia('/reports/stock-levels', 'bulkstore/reports/StockLevels')->name('reports.stock-levels');
        Route::inertia('/reports/movements', 'bulkstore/reports/StockMovements')->name('reports.movements');
        Route::inertia('/reports/consumption', 'bulkstore/reports/Consumption')->name('reports.consumption');
        Route::inertia('/reports/expiry', 'bulkstore/reports/Expiry')->name('reports.expiry');

        /*
        |--------------------------------------------------------------------------
        | Audit
        |--------------------------------------------------------------------------
        */
        Route::inertia('/audit-trail', 'bulkstore/AuditTrail')->name('audit');

        /*
        |--------------------------------------------------------------------------
        | Settings
        |--------------------------------------------------------------------------
        */
        Route::inertia('/module-settings', 'bulkstore/Settings')->name('settings');
    });

// ------------------------------------------------------------------
// API Routes for Bulk Store (AJAX / JSON endpoints)
// ------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'verified'])
    ->prefix('api/bulkstore')
    ->name('api.bulkstore.')
    ->group(function () {

        // Dashboard API endpoints
        Route::get('/dashboard/data', [BulkStoreController::class, 'refreshDashboard'])->name('dashboard.data');

        // ------------------------------------------------------------------
        // Bulk Stores CRUD
        // ------------------------------------------------------------------
        Route::apiResource('bulk-stores', BulkStoreController::class);

        // ------------------------------------------------------------------
        // Departments
        // ------------------------------------------------------------------
        Route::apiResource('departments', \App\Http\Controllers\BulkStores\DepartmentController::class);

        // ------------------------------------------------------------------
        // Suppliers
        // ------------------------------------------------------------------
        Route::apiResource('suppliers', \App\Http\Controllers\BulkStores\SupplierController::class);

        // ------------------------------------------------------------------
        // Products
        // ------------------------------------------------------------------
        Route::apiResource('products', ProductController::class);

        // ------------------------------------------------------------------
        // Purchase Requisitions
        // ------------------------------------------------------------------
        Route::apiResource('purchase-requisitions', PurchaseRequisitionController::class);

        // ------------------------------------------------------------------
        // Stock Movements (list + individual transaction endpoints)
        // ------------------------------------------------------------------
        Route::prefix('stock-movements')->name('movements.')->group(function () {
            // Audit log (read-only)
            Route::get('/', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'index'])->name('index');
            Route::get('/{stockMovement}', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'show'])->name('show');

            // Write operations – each maps to a StockService method
            Route::post('/receive', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'receive'])->name('receive');
            Route::post('/issue', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'issue'])->name('issue');
            Route::post('/transfer', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'transfer'])->name('transfer');
            Route::post('/adjust', [\App\Http\Controllers\BulkStores\StockMovementController::class, 'adjust'])->name('adjust');
        });

        // ------------------------------------------------------------------
        // Purchase Orders
        // ------------------------------------------------------------------
        Route::prefix('purchase-orders')->name('purchase-orders.')->group(function () {
            Route::get('/', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'store'])->name('store');
            Route::get('/{purchaseOrder}', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'show'])->name('show');
            Route::delete('/{purchaseOrder}', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'destroy'])->name('destroy');

            // Status transitions
            Route::post('/{purchaseOrder}/approve', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'approve'])->name('approve');
            Route::post('/{purchaseOrder}/receive', [\App\Http\Controllers\BulkStores\PurchaseOrderController::class, 'receive'])->name('receive');
        });

        // ------------------------------------------------------------------
        // Goods Received Notes
        // ------------------------------------------------------------------
        Route::apiResource('goods-received-notes', GoodsReceivedNoteController::class);

        // ------------------------------------------------------------------
        // Reports
        // ------------------------------------------------------------------
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/stock-levels', [\App\Http\Controllers\BulkStores\ReportController::class, 'stockLevels'])->name('stock-levels');
            Route::get('/movements', [\App\Http\Controllers\BulkStores\ReportController::class, 'movements'])->name('movements');
            Route::get('/consumption', [\App\Http\Controllers\BulkStores\ReportController::class, 'consumption'])->name('consumption');
            Route::get('/expiry', [\App\Http\Controllers\BulkStores\ReportController::class, 'expiry'])->name('expiry');
        });
    });

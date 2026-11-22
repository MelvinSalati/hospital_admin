<?php

use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\FinanceExpenseController;
use App\Http\Controllers\Admin\FinanceRevenueController;
use Illuminate\Support\Facades\Route;

/*
 | API routes (routes/api.php): the data endpoints the page calls through Http.
 | Paste inside the SAME group/prefix/middleware as '/admin/all-budgets' and
 | '/admin/budget-transactions' (the group that ends up at /api/v1/...), so the
 | final URLs are /api/v1/admin/finance/overview, .../collections, etc.
 | Do NOT add another 'api/v1' prefix here.
 */

Route::prefix('v1/admin/finance')->group(function () {
    Route::get('/overview', [FinanceController::class, 'overview']);
    Route::get('/collections', [FinanceController::class, 'collections']);

    // Other revenue
    Route::get('/revenues', [FinanceRevenueController::class, 'index']);
    Route::post('/revenues', [FinanceRevenueController::class, 'store']);
    Route::post('/revenues/{revenue}/receive', [FinanceRevenueController::class, 'markReceived']);
    Route::post('/revenues/{revenue}/cancel', [FinanceRevenueController::class, 'cancel']);

    // Expenses
    Route::get('/expenses', [FinanceExpenseController::class, 'index']);
    Route::post('/expenses', [FinanceExpenseController::class, 'store']);
    Route::post('/expenses/{expense}/approve', [FinanceExpenseController::class, 'approve']);
    Route::post('/expenses/{expense}/reject', [FinanceExpenseController::class, 'reject']);
    Route::post('/expenses/{expense}/pay', [FinanceExpenseController::class, 'markPaid']);
    Route::post('/expenses/{expense}/void', [FinanceExpenseController::class, 'void']);
});

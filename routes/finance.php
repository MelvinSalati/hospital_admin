<?php

use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\FinanceExpenseController;
use App\Http\Controllers\Admin\FinanceRevenueController;
use Illuminate\Support\Facades\Route;

/*
 | Paste inside your existing authenticated admin group in routes/web.php, e.g.
 |   Route::middleware(['auth', 'verified'])->group(function () { ... });
 | or require this file from there.
 */

Route::prefix('admin/finance')->name('admin.finance.')->group(function () {
    // Page + overview + collections (read-only from `payments`)
    Route::get('/', [FinanceController::class, 'index'])->name('index');
    Route::get('/overview', [FinanceController::class, 'overview'])->name('overview');
    Route::get('/collections', [FinanceController::class, 'collections'])->name('collections');

    // Other revenue
    Route::get('/revenues', [FinanceRevenueController::class, 'index'])->name('revenues.index');
    Route::post('/revenues', [FinanceRevenueController::class, 'store'])->name('revenues.store');
    Route::post('/revenues/{revenue}/receive', [FinanceRevenueController::class, 'markReceived'])->name('revenues.receive');
    Route::post('/revenues/{revenue}/cancel', [FinanceRevenueController::class, 'cancel'])->name('revenues.cancel');

    // Expenses / spending
    Route::get('/expenses', [FinanceExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [FinanceExpenseController::class, 'store'])->name('expenses.store');
    Route::post('/expenses/{expense}/approve', [FinanceExpenseController::class, 'approve'])->name('expenses.approve');
    Route::post('/expenses/{expense}/reject', [FinanceExpenseController::class, 'reject'])->name('expenses.reject');
    Route::post('/expenses/{expense}/pay', [FinanceExpenseController::class, 'markPaid'])->name('expenses.pay');
    Route::post('/expenses/{expense}/void', [FinanceExpenseController::class, 'void'])->name('expenses.void');
});

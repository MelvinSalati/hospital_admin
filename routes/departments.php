<?php

use App\Http\Controllers\Departments\DepartmentController;
use Illuminate\Support\Facades\Route;



Route::middleware(['auth', 'verified'])->group(function () {
    // web.php or api.php
    
    Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
    Route::post('/departments', [DepartmentController::class, 'store']);
    Route::put('/departments/{id}', [DepartmentController::class, 'update']);
    Route::delete('/departments/{id}', [DepartmentController::class, 'destroy']);

});

// api.php
Route::apiResource('departments', DepartmentController::class);
Route::apiResource('services', ServiceController::class);
Route::get('departments/{department}/services', [ServiceController::class, 'getByDepartment']);

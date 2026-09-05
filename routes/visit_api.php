<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Patients\QueueController;

Route::prefix('patient')->group(function () {
    Route::post('create/visit', [QueueController::class, 'store']);
});

<?php

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\VacancyController;
use Illuminate\Support\Facades\Route;

// ---- Public ----
Route::post('auth/login', [AuthController::class, 'login']);
Route::post('applications', [ApplicationController::class, 'store']);
Route::get('vacancies', [VacancyController::class, 'index']);
Route::get('content', [ContentController::class, 'index']);

// ---- Admin (Sanctum token required) ----
Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Inbox
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::patch('applications/{application}/status', [ApplicationController::class, 'updateStatus']);
    Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);

    // Vacancies
    Route::get('admin/vacancies', [VacancyController::class, 'adminIndex']);
    Route::post('vacancies', [VacancyController::class, 'store']);
    Route::post('vacancies/{vacancy}', [VacancyController::class, 'update']); // POST for multipart
    Route::delete('vacancies/{vacancy}', [VacancyController::class, 'destroy']);

    // Content (CMS)
    Route::get('admin/content', [ContentController::class, 'all']);
    Route::put('content', [ContentController::class, 'bulkUpdate']);
    Route::post('content/image', [ContentController::class, 'uploadImage']);
});

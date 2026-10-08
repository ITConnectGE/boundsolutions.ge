<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\VacancyCategoryController;
use App\Http\Controllers\Api\VacancyController;
use Illuminate\Support\Facades\Route;

// ---- Public ----
// The two endpoints anyone can POST to are rate limited per visitor IP
// (see AppServiceProvider): a bot would otherwise be free to flood the inbox
// or to guess admin passwords.
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('applications', [ApplicationController::class, 'store'])->middleware('throttle:forms');
Route::get('vacancies', [VacancyController::class, 'index']);
Route::get('vacancy-categories', [VacancyCategoryController::class, 'index']);
Route::get('content', [ContentController::class, 'index']);

// ---- Signed in (Sanctum token required) ----
Route::middleware('auth:sanctum')->group(function () {
    // Reachable with a temporary-password token too, so an invited admin can
    // sign in, see who they are, set a real password and log out.
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/password', [AuthController::class, 'setPassword']);

    // ---- Admin (full access: the temporary-password token is rejected) ----
    Route::middleware('ability:admin')->group(function () {
        // Inbox
        Route::get('applications', [ApplicationController::class, 'index']);
        // CV files are not public; this is the only way to download one.
        Route::get('applications/{application}/cv', [ApplicationController::class, 'cv']);
        Route::patch('applications/{application}/status', [ApplicationController::class, 'updateStatus']);
        Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);

        // Vacancies
        Route::get('admin/vacancies', [VacancyController::class, 'adminIndex']);
        Route::post('vacancies', [VacancyController::class, 'store']);
        Route::post('vacancies/{vacancy}', [VacancyController::class, 'update']); // POST for multipart
        Route::delete('vacancies/{vacancy}', [VacancyController::class, 'destroy']);

        // Vacancy categories (managed filter set)
        Route::put('vacancy-categories', [VacancyCategoryController::class, 'sync']);

        // Content (CMS)
        Route::get('admin/content', [ContentController::class, 'all']);
        Route::put('content', [ContentController::class, 'bulkUpdate']);
        Route::post('content/image', [ContentController::class, 'uploadImage']);

        // Received email (Mailgun -> laravel-mailbox webhook)
        Route::get('inbox', [InboxController::class, 'index']);
        Route::get('inbox/{inbox}', [InboxController::class, 'show']);
        Route::get('inbox/{inbox}/attachments/{index}', [InboxController::class, 'attachment']);
        Route::post('inbox/{inbox}/reply', [InboxController::class, 'reply']);
        Route::delete('inbox/{inbox}', [InboxController::class, 'destroy']);

        // Admin accounts (invite / resend temporary password / remove)
        Route::get('admin/users', [AdminUserController::class, 'index']);
        Route::post('admin/users', [AdminUserController::class, 'store']);
        Route::post('admin/users/{user}/resend', [AdminUserController::class, 'resend']);
        Route::delete('admin/users/{user}', [AdminUserController::class, 'destroy']);
    });
});

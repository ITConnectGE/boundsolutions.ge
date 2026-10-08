<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Root-level sitemaps (/sitemap-vacancies.xml): stateless, no /api prefix.
            Route::middleware('api')->group(__DIR__.'/../routes/sitemap.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Without this, an unauthenticated request that does not ask for JSON
        // (a browser opening /api/..., a crawler) makes the framework look for
        // a "login" route that does not exist here, and answers 500 instead of
        // 401. API callers get the exception (-> 401 JSON, see withExceptions
        // below); anything else is sent to the admin sign-in page.
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('api/*') ? null : '/admin/login'
        );

        // Sanctum's token-ability guards. Admin routes require the "admin"
        // ability, which a token issued against a temporary password lacks.
        $middleware->alias([
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();

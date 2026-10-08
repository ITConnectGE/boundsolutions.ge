<?php

namespace App\Providers;

use BeyondCode\Mailbox\Facades\Mailbox;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Capture ALL incoming email into the admin inbox. Registering a
        // catch-all is what makes laravel-mailbox persist the message
        // (see Router::callMailboxes). Storage is handled by the package;
        // our extended model denormalizes the row on save.
        // Abuse limits for the public endpoints. Cloudflare sits in front of
        // nginx, so $request->ip() is a Cloudflare edge address and would put
        // every visitor in one bucket; the visitor's own address arrives in
        // CF-Connecting-IP.
        $clientIp = fn (Request $request) => $request->header('CF-Connecting-IP') ?: $request->ip();

        RateLimiter::for('forms', fn (Request $request) => Limit::perMinute(10)->by($clientIp($request)));
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(10)->by($clientIp($request)),
            Limit::perMinute(5)->by(Str::lower((string) $request->input('email'))),
        ]);

        Mailbox::catchAll(function () {
            // no-op: matching a route triggers storage; nothing else to do.
        });
    }
}

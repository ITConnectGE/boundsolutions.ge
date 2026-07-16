<?php

namespace App\Providers;

use BeyondCode\Mailbox\Facades\Mailbox;
use Illuminate\Support\ServiceProvider;

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
        Mailbox::catchAll(function () {
            // no-op: matching a route triggers storage; nothing else to do.
        });
    }
}

<?php

use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

// Public XML sitemaps served at the site root (nginx passes these exact paths to
// Laravel). Registered with the stateless "api" middleware group in
// bootstrap/app.php: no session, cookies or CSRF for a crawler request.
Route::get('/sitemap-vacancies.xml', [SitemapController::class, 'vacancies']);

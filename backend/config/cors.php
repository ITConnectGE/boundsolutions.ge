<?php

// CORS for the API. The Vue frontend (GitHub Pages / localhost dev) calls these
// endpoints cross-origin. Add your production frontend origin to CORS_ALLOWED_ORIGINS
// (comma-separated) in .env, or adjust the defaults below.
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,https://boundsolutions.ge,https://www.boundsolutions.ge'
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];

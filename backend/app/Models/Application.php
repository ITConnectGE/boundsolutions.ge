<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $fillable = [
        'type', 'name', 'contact_name', 'email', 'phone',
        'position', 'sector', 'message', 'cv_path', 'details',
        'consent', 'status',
    ];

    protected $casts = [
        'details' => 'array',
        'consent' => 'boolean',
    ];
}

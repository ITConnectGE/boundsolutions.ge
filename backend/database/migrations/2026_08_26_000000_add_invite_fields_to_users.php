<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Admins invited from the admin panel receive a temporary password by email and
// must replace it before the panel lets them in (see AuthController::setPassword).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_reset_password')->default(false)->after('password');
            $table->timestamp('invited_at')->nullable()->after('must_reset_password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['must_reset_password', 'invited_at']);
        });
    }
};

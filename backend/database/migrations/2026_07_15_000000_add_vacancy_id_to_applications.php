<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Link CV submissions to the vacancy they were sent for (null = general / no
// position). Kept as a plain nullable id (no strict FK) so deleting a vacancy
// doesn't cascade-delete the applications.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->unsignedBigInteger('vacancy_id')->nullable()->index()->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('vacancy_id');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The city a vacancy is for. Every vacancy used to show "თბილისი", which was a
// fixed label in the interface. Left empty, the site falls back to that same
// default, so nothing changes for the vacancies already published.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->string('location_ka')->nullable()->after('sector_en');
            $table->string('location_en')->nullable()->after('location_ka');
        });
    }

    public function down(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->dropColumn(['location_ka', 'location_en']);
        });
    }
};

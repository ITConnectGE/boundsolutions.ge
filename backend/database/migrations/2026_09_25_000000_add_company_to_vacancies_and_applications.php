<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Which client company a vacancy is for. Internal: it is shown in the admin
// panel only (never in the public vacancy list), so two vacancies with the same
// title - "ოფისის მენეჯერი" twice - can be told apart in the CV inbox.
// Applications keep a copy taken at submission time, so the inbox still shows it
// after the vacancy itself is deleted.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->string('company')->nullable()->after('category');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->string('company')->nullable()->after('sector');
        });
    }

    public function down(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->dropColumn('company');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('company');
        });
    }
};

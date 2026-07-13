<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Vacancy categories — the filter set shown on the public Vacancies page,
// managed (added / removed / reordered) from the admin panel.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacancy_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->integer('position')->default(0)->index();
            $table->timestamps();
        });

        // Seed the built-in defaults so the filter bar isn't empty on first run.
        foreach (['HR', 'Sales', 'HORECA', 'Finance', 'Events'] as $i => $name) {
            DB::table('vacancy_categories')->insertOrIgnore([
                'name' => $name,
                'position' => $i,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vacancy_categories');
    }
};

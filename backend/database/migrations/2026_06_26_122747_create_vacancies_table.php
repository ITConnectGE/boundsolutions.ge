<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Vacancies managed from the admin panel and shown on the public Vacancies page.
// (Named "vacancies", not "jobs", because Laravel already uses bs_jobs for queues.)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacancies', function (Blueprint $table) {
            $table->id();
            $table->string('category')->default('hr')->index(); // horeca|finance|events|hr|sales
            $table->string('title_ka');
            $table->string('title_en')->nullable();
            $table->string('sector_ka')->nullable();
            $table->string('sector_en')->nullable();
            $table->string('salary')->nullable();
            $table->text('description_ka')->nullable();
            $table->text('description_en')->nullable();
            $table->string('image_path')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacancies');
    }
};

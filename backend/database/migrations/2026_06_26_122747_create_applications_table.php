<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Inbox of everything submitted from the public site:
//  - type=cv      : candidate CV applications (Vacancies page)
//  - type=contact : contact-form messages
//  - type=company : B2B vacancy-request questionnaire (For employers)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('cv')->index(); // cv | contact | company
            $table->string('name')->nullable();             // applicant or company name
            $table->string('contact_name')->nullable();     // company contact person
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('position')->nullable();
            $table->string('sector')->nullable();
            $table->text('message')->nullable();
            $table->string('cv_path')->nullable();           // stored CV file
            $table->json('details')->nullable();             // structured questionnaire answers
            $table->boolean('consent')->default(false);
            $table->string('status')->default('new')->index(); // new | reviewed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};

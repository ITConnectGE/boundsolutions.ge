<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Editable site content (CMS). Each row is one editable piece of the site:
//  - key    : dot path, e.g. "home.hero.subtitle" or "home.hero.image"
//  - locale : ka | en  (null for non-localized values like images)
//  - type   : text | image
//  - value  : the text, or the image path/URL
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contents', function (Blueprint $table) {
            $table->id();
            $table->string('group')->default('general')->index(); // home | about | ...
            $table->string('key')->index();
            $table->string('locale', 5)->nullable()->index();      // ka | en | null
            $table->string('type')->default('text');               // text | image
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->unique(['key', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contents');
    }
};

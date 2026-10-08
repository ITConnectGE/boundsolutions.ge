<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

// CVs used to live on the public disk, which nginx serves to anyone who has the
// URL - no login needed. They are personal data, so they move to the private
// disk; ApplicationController::cv() serves them behind the admin token.
// The stored cv_path stays the same, only the disk changes.
return new class extends Migration
{
    public function up(): void
    {
        $this->move('public', 'local');
    }

    public function down(): void
    {
        $this->move('local', 'public');
    }

    private function move(string $from, string $to): void
    {
        $source = Storage::disk($from);
        $target = Storage::disk($to);

        foreach ($source->files('cv') as $path) {
            if ($target->exists($path)) {
                $source->delete($path);
                continue;
            }
            if ($target->writeStream($path, $source->readStream($path))) {
                $source->delete($path);
            }
        }
    }
};

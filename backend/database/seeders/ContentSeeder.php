<?php

namespace Database\Seeders;

use App\Models\Content;
use Illuminate\Database\Seeder;

// Populates the `contents` table with every site text (ka + en) from
// database/seeders/content.json (generated from the frontend i18n).
// Uses insertOrIgnore so it NEVER overwrites values an admin has already edited.
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/content.json');
        if (! is_file($path)) {
            return;
        }

        $rows = json_decode(file_get_contents($path), true) ?: [];
        $now = now();

        $prepared = array_map(fn ($r) => [
            'group' => $r['group'] ?? 'general',
            'key' => $r['key'],
            'locale' => $r['locale'],
            'type' => $r['type'] ?? 'text',
            'value' => $r['value'] ?? '',
            'created_at' => $now,
            'updated_at' => $now,
        ], $rows);

        foreach (array_chunk($prepared, 200) as $chunk) {
            Content::insertOrIgnore($chunk);
        }

        $this->command?->info('Seeded '.count($prepared).' content rows (existing kept).');
    }
}

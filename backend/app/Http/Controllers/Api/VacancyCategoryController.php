<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VacancyCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VacancyCategoryController extends Controller
{
    // Public: ordered list of category names.
    public function index()
    {
        return VacancyCategory::orderBy('position')->orderBy('id')->pluck('name');
    }

    // Admin: replace the whole set with the given ordered list of names.
    public function sync(Request $request)
    {
        $data = $request->validate([
            'names' => 'present|array',
            'names.*' => 'string|max:50',
        ]);

        // Trim, drop blanks, de-duplicate case-insensitively, keep order.
        $seen = [];
        $names = [];
        foreach ($data['names'] as $n) {
            $n = trim($n);
            $key = mb_strtolower($n);
            if ($n === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $names[] = $n;
        }

        DB::transaction(function () use ($names) {
            VacancyCategory::query()->delete();
            foreach ($names as $i => $name) {
                VacancyCategory::create(['name' => $name, 'position' => $i]);
            }
        });

        return VacancyCategory::orderBy('position')->orderBy('id')->pluck('name');
    }
}

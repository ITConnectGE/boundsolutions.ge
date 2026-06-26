<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vacancy;
use Illuminate\Http\Request;

class VacancyController extends Controller
{
    // Public: active vacancies in the {ka,en} shape the frontend expects.
    public function index()
    {
        return Vacancy::where('is_active', true)
            ->orderBy('sort_order')
            ->latest('id')
            ->get()
            ->map(fn (Vacancy $v) => $v->toPublicArray());
    }

    // Admin: full list (raw columns) for the management UI.
    public function adminIndex()
    {
        return Vacancy::orderBy('sort_order')->latest('id')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $this->handleImage($request, $data);

        return response()->json(Vacancy::create($data), 201);
    }

    // POST (not PUT) so multipart image uploads work.
    public function update(Request $request, Vacancy $vacancy)
    {
        $data = $this->validateData($request);
        $this->handleImage($request, $data);
        $vacancy->update($data);

        return $vacancy;
    }

    public function destroy(Vacancy $vacancy)
    {
        $vacancy->delete();

        return response()->noContent();
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'category' => 'required|string|max:50',
            'title_ka' => 'required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'sector_ka' => 'nullable|string|max:255',
            'sector_en' => 'nullable|string|max:255',
            'salary' => 'nullable|string|max:100',
            'description_ka' => 'nullable|string',
            'description_en' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'image' => 'nullable|file|image|max:5120',
        ]);
    }

    private function handleImage(Request $request, array &$data): void
    {
        unset($data['image']);
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('vacancies', 'public');
        }
    }
}

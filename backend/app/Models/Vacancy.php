<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vacancy extends Model
{
    protected $fillable = [
        'category', 'title_ka', 'title_en', 'sector_ka', 'sector_en',
        'salary', 'description_ka', 'description_en', 'image_path',
        'is_active', 'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Shape consumed by the Vue frontend ({ka,en} objects + absolute image URL).
    public function toPublicArray(): array
    {
        return [
            'id' => 'v' . $this->id,
            'category' => $this->category,
            'title' => ['ka' => $this->title_ka, 'en' => $this->title_en ?: $this->title_ka],
            'sector' => ['ka' => $this->sector_ka, 'en' => $this->sector_en ?: $this->sector_ka],
            'salary' => $this->salary,
            'description' => ['ka' => $this->description_ka, 'en' => $this->description_en],
            'image' => $this->image_path ? asset('storage/' . $this->image_path) : null,
        ];
    }

    // Same shape plus the fields only the admin panel needs. Hidden vacancies
    // (is_active = false) are kept out of toPublicArray()'s listing but still
    // have to reach the panel, otherwise they could never be switched back on.
    public function toAdminArray(): array
    {
        return $this->toPublicArray() + [
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}

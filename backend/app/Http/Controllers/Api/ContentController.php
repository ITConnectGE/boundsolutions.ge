<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    // Public: editable content for one locale, as a flat { key: value } map the
    // frontend merges over its built-in defaults. Images resolve to absolute URLs.
    public function index(Request $request)
    {
        $locale = $request->get('locale', 'ka');

        $rows = Content::where(function ($q) use ($locale) {
            $q->where('locale', $locale)->orWhereNull('locale');
        })->get();

        $map = [];
        foreach ($rows as $c) {
            $map[$c->key] = $c->type === 'image' && $c->value
                ? asset('storage/' . $c->value)
                : $c->value;
        }

        return $map;
    }

    // Admin: every editable row (both locales) for the editor UI.
    public function all()
    {
        return Content::orderBy('group')->orderBy('key')->get();
    }

    // Admin: upsert many text values at once.
    public function bulkUpdate(Request $request)
    {
        $payload = $request->validate([
            'items' => 'required|array',
            'items.*.key' => 'required|string',
            'items.*.locale' => 'nullable|string|max:5',
            'items.*.value' => 'nullable|string',
            'items.*.type' => 'nullable|string',
            'items.*.group' => 'nullable|string',
        ]);

        foreach ($payload['items'] as $it) {
            Content::updateOrCreate(
                ['key' => $it['key'], 'locale' => $it['locale'] ?? null],
                [
                    'value' => $it['value'] ?? '',
                    'type' => $it['type'] ?? 'text',
                    'group' => $it['group'] ?? 'general',
                ]
            );
        }

        return response()->json(['ok' => true]);
    }

    // Admin: upload an image for a content key (e.g. home.hero.image).
    public function uploadImage(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
            'group' => 'nullable|string',
            'image' => 'required|file|image|max:5120',
        ]);

        $path = $request->file('image')->store('content', 'public');

        $content = Content::updateOrCreate(
            ['key' => $request->key, 'locale' => null],
            ['type' => 'image', 'value' => $path, 'group' => $request->group ?? 'general']
        );

        return response()->json(['key' => $content->key, 'url' => asset('storage/' . $path)]);
    }
}

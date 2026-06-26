<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    // Admin: list the inbox with optional filters.
    public function index(Request $request)
    {
        $q = Application::query()->latest();

        if ($request->filled('type') && $request->type !== 'all') {
            $q->where('type', $request->type);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $q->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(function ($w) use ($s) {
                foreach (['name', 'contact_name', 'email', 'phone', 'position', 'sector'] as $c) {
                    $w->orWhere($c, 'like', "%{$s}%");
                }
            });
        }

        return $q->get();
    }

    // Public: a submission from the site (CV / contact / company questionnaire).
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:cv,contact,company',
            'name' => 'nullable|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'position' => 'nullable|string|max:255',
            'sector' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'details' => 'nullable|array',
            'consent' => 'nullable|boolean',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        if ($request->hasFile('cv')) {
            $data['cv_path'] = $request->file('cv')->store('cv', 'public');
        }
        unset($data['cv']);
        $data['status'] = 'new';

        return response()->json(Application::create($data), 201);
    }

    // Admin: flip new <-> reviewed.
    public function updateStatus(Request $request, Application $application)
    {
        $data = $request->validate(['status' => 'required|in:new,reviewed']);
        $application->update($data);

        return $application;
    }

    // Admin: delete.
    public function destroy(Application $application)
    {
        $application->delete();

        return response()->noContent();
    }
}

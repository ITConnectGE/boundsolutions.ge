<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\NewApplicationMail;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
            'vacancy_id' => 'nullable|integer',
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

        $application = Application::create($data);

        // Best-effort email notification (with the CV attached). Never breaks the
        // submission — the record is already saved to the admin inbox above.
        try {
            $to = config('mail.to_address') ?: config('mail.from.address');
            if ($to && config('mail.default') !== 'log') {
                Mail::to($to)->send(new NewApplicationMail($application));
            }
        } catch (\Throwable $e) {
            Log::warning('Application email failed: ' . $e->getMessage());
        }

        return response()->json($application, 201);
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

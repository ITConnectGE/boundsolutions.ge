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
            // Every submission must carry a reachable email AND phone. Same
            // rules as src/utils/validation.js, so a direct POST can't skip them.
            'email' => [
                'required', 'string', 'max:254', 'email',
                'regex:/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/',
                'not_regex:/\.\./',
            ],
            'phone' => ['required', 'string', 'max:50', function ($attribute, $value, $fail) {
                if (! $this->isValidPhone((string) $value)) {
                    $fail('Enter a valid phone number, e.g. 555 12 34 56 or +995 555 12 34 56.');
                }
            }],
            'position' => 'nullable|string|max:255',
            'vacancy_id' => 'nullable|integer',
            'sector' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'details' => 'nullable|array',
            'consent' => 'nullable|boolean',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $data['phone'] = $this->normalizePhone($data['phone']);

        if ($request->hasFile('cv')) {
            $data['cv_path'] = $request->file('cv')->store('cv', 'public');
        }
        unset($data['cv']);
        $data['status'] = 'new';

        $application = Application::create($data);

        // Best-effort email notification (with the CV attached). Never breaks the
        // submission - the record is already saved to the admin inbox above.
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

    // Phone rules, mirrored from the frontend: written without a country code it
    // must be a full Georgian number (9 digits, 5xx mobile / 3xx landline);
    // written with + or 00 it must be E.164 shaped (8-15 digits).
    private function isValidPhone(string $value): bool
    {
        $raw = trim($value);
        if ($raw === '' || ! preg_match('#^\+?[\d\s()./-]+$#', $raw)) {
            return false;
        }
        $intl = str_starts_with($raw, '+') || str_starts_with($raw, '00');
        $digits = preg_replace('/^00/', '', preg_replace('/\D/', '', $raw));

        if (str_starts_with($digits, '995')) {
            return strlen($digits) === 12 && (bool) preg_match('/^995[35]/', $digits);
        }
        if (! $intl) {
            return strlen($digits) === 9 && (bool) preg_match('/^[35]/', $digits);
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15;
    }

    // Store one shape (+995XXXXXXXXX) so the inbox and CSV export stay searchable.
    private function normalizePhone(string $value): string
    {
        $raw = trim($value);
        $digits = preg_replace('/^00/', '', preg_replace('/\D/', '', $raw));

        if (str_starts_with($digits, '995') && strlen($digits) === 12) {
            return '+'.$digits;
        }
        if (strlen($digits) === 9 && preg_match('/^[35]/', $digits)) {
            return '+995'.$digits;
        }

        return str_starts_with($raw, '+') || str_starts_with($raw, '00') ? '+'.$digits : $raw;
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

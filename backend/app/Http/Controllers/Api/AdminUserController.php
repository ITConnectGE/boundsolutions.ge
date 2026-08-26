<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AdminInviteMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

// Admin accounts, managed from the admin panel. A new admin is created with a
// temporary password that is emailed to them and can't reach any admin endpoint
// until it is replaced (AuthController::setPassword issues the full token).
class AdminUserController extends Controller
{
    private const FIELDS = ['id', 'name', 'email', 'must_reset_password', 'invited_at', 'created_at'];

    public function index()
    {
        return User::query()->orderBy('name')->get(self::FIELDS);
    }

    // Invite a new admin: create the account, email the temporary password.
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:254', 'unique:users,email'],
        ]);

        $temporary = $this->temporaryPassword();

        $user = User::create([
            'name' => $data['name'],
            'email' => mb_strtolower(trim($data['email'])),
            'password' => $temporary,
            'must_reset_password' => true,
        ]);
        $user->forceFill(['invited_at' => now()])->save();

        return response()->json($this->inviteResponse($user, $temporary), 201);
    }

    // New temporary password for someone who lost or never got the first email.
    public function resend(User $user)
    {
        $temporary = $this->temporaryPassword();

        $user->forceFill([
            'password' => $temporary,
            'must_reset_password' => true,
            'invited_at' => now(),
        ])->save();

        // Any session the user still holds is invalidated by the new password.
        $user->tokens()->delete();

        return response()->json($this->inviteResponse($user, $temporary));
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }
        if (User::count() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['At least one admin account must remain.'],
            ]);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->noContent();
    }

    // ---- helpers ----

    private function inviteResponse(User $user, string $temporary): array
    {
        $sent = $this->sendInvite($user, $temporary);

        return [
            'user' => $user->only(self::FIELDS),
            'email_sent' => $sent,
            // Shown once in the panel so the invite still works when SMTP is
            // unavailable; never stored and never returned again.
            'temp_password' => $sent ? null : $temporary,
        ];
    }

    private function sendInvite(User $user, string $temporary): bool
    {
        if (config('mail.default') === 'log') {
            return false;
        }

        try {
            Mail::to($user->email)->send(new AdminInviteMail($user, $temporary, $this->loginUrl()));

            return true;
        } catch (\Throwable $e) {
            Log::warning('Admin invite email failed: '.$e->getMessage());

            return false;
        }
    }

    private function loginUrl(): string
    {
        return rtrim((string) config('app.admin_url'), '/');
    }

    // 12 readable characters (no 0/O/1/l), guaranteed to mix letters and digits.
    private function temporaryPassword(): string
    {
        $letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        $digits = '23456789';
        $alphabet = $letters.$digits;

        $chars = [
            $letters[random_int(0, strlen($letters) - 1)],
            $digits[random_int(0, strlen($digits) - 1)],
        ];
        for ($i = 0; $i < 10; $i++) {
            $chars[] = $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        // Fisher-Yates so the guaranteed letter/digit aren't always first.
        for ($i = count($chars) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }

        return implode('', $chars);
    }
}

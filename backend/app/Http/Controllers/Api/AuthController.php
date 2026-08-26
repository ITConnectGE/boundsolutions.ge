<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Issue a Sanctum token for a valid admin user. Someone still holding the
    // temporary password from an invite gets a token limited to "password:set",
    // so every admin endpoint (guarded by ability:admin) stays closed to them
    // until they choose their own password.
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        return response()->json($this->session($user));
    }

    // Replace the current password. Called right after signing in with a
    // temporary one, and usable by any signed-in admin who wants to change it.
    public function setPassword(Request $request)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();

        if (Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Choose a password different from your current one.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
            'must_reset_password' => false,
        ])->save();

        // Drop every token, including the limited one this request came in on,
        // then hand back a full-access token so the panel opens immediately.
        $user->tokens()->delete();

        return response()->json($this->session($user));
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    private function session(User $user): array
    {
        $mustReset = (bool) $user->must_reset_password;

        return [
            'token' => $user->createToken('admin', $mustReset ? ['password:set'] : ['admin'])->plainTextToken,
            'must_reset_password' => $mustReset,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'must_reset_password' => $mustReset,
            ],
        ];
    }
}

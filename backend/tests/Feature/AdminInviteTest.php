<?php

namespace Tests\Feature;

use App\Mail\AdminInviteMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Invite an admin -> temporary password by email -> the panel stays closed
// until that password is replaced.
class AdminInviteTest extends TestCase
{
    use RefreshDatabase;

    private function existingAdmin(): User
    {
        return User::create([
            'name' => 'Nino',
            'email' => 'nino@example.com',
            'password' => 'Existing1pass',
            'must_reset_password' => false,
        ]);
    }

    // One app instance serves every request in a test, so the auth guard would
    // keep the first user it resolved. Forget it, the way a real request does.
    private function asToken(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function login(string $email, string $password): array
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/auth/login', compact('email', 'password'))->json();
    }

    public function test_invited_admin_must_set_a_password_before_reaching_the_panel(): void
    {
        Mail::fake();

        $admin = $this->existingAdmin();
        $session = $this->login($admin->email, 'Existing1pass');
        $this->assertFalse($session['must_reset_password']);

        // ---- invite ----
        $invite = $this->asToken($session['token'])
            ->postJson('/api/admin/users', ['name' => 'Elene', 'email' => 'Elene@Example.com'])
            ->assertCreated()
            ->json();

        $this->assertTrue($invite['email_sent']);
        $this->assertNull($invite['temp_password'], 'the password is not echoed back when the email went out');

        $invited = User::where('email', 'elene@example.com')->firstOrFail();
        $this->assertTrue($invited->must_reset_password);
        $this->assertNotNull($invited->invited_at);

        $temporary = null;
        Mail::assertSent(AdminInviteMail::class, function (AdminInviteMail $mail) use (&$temporary, $invited) {
            $temporary = $mail->temporaryPassword;

            return $mail->hasTo($invited->email);
        });
        $this->assertMatchesRegularExpression('/^(?=.*[A-Za-z])(?=.*\d).{12}$/', (string) $temporary);

        // ---- sign in with the temporary password ----
        $temp = $this->login('elene@example.com', $temporary);
        $this->assertTrue($temp['must_reset_password']);

        // ---- every admin endpoint is closed ----
        $this->asToken($temp['token'])->getJson('/api/applications')->assertForbidden();
        $this->asToken($temp['token'])->getJson('/api/admin/users')->assertForbidden();
        $this->asToken($temp['token'])->getJson('/api/admin/content')->assertForbidden();
        // but the account can still identify itself and set a password
        $this->asToken($temp['token'])->getJson('/api/auth/me')->assertOk();

        // ---- weak, unconfirmed, or unchanged passwords are rejected ----
        $this->asToken($temp['token'])
            ->postJson('/api/auth/password', ['password' => 'short1', 'password_confirmation' => 'short1'])
            ->assertStatus(422);
        $this->asToken($temp['token'])
            ->postJson('/api/auth/password', ['password' => 'Longenough1', 'password_confirmation' => 'different1'])
            ->assertStatus(422);
        $this->asToken($temp['token'])
            ->postJson('/api/auth/password', ['password' => $temporary, 'password_confirmation' => $temporary])
            ->assertStatus(422);

        // ---- setting a real password opens the panel ----
        $full = $this->asToken($temp['token'])
            ->postJson('/api/auth/password', [
                'password' => 'ChosenPass1',
                'password_confirmation' => 'ChosenPass1',
            ])->assertOk()->json();

        $this->assertFalse($full['must_reset_password']);
        $this->assertFalse(User::find($invited->id)->must_reset_password);
        $this->asToken($full['token'])->getJson('/api/applications')->assertOk();

        // the limited token was revoked together with the temporary password
        $this->asToken($temp['token'])->getJson('/api/auth/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['email' => 'elene@example.com', 'password' => $temporary])
            ->assertStatus(422);
    }

    public function test_resend_issues_a_new_temporary_password_and_locks_the_panel_again(): void
    {
        Mail::fake();

        $admin = $this->existingAdmin();
        $token = $this->login($admin->email, 'Existing1pass')['token'];

        $this->asToken($token)->postJson('/api/admin/users', [
            'name' => 'Elene', 'email' => 'elene@example.com',
        ])->assertCreated();

        $invited = User::where('email', 'elene@example.com')->firstOrFail();
        $invited->forceFill(['password' => 'ChosenPass1', 'must_reset_password' => false])->save();

        $this->asToken($token)->postJson("/api/admin/users/{$invited->id}/resend")->assertOk();

        $this->assertTrue($invited->fresh()->must_reset_password);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['email' => 'elene@example.com', 'password' => 'ChosenPass1'])
            ->assertStatus(422);
    }

    public function test_an_admin_cannot_delete_their_own_account(): void
    {
        Mail::fake();

        $admin = $this->existingAdmin();
        $token = $this->login($admin->email, 'Existing1pass')['token'];

        $this->asToken($token)->deleteJson("/api/admin/users/{$admin->id}")->assertStatus(422);

        $this->asToken($token)->postJson('/api/admin/users', [
            'name' => 'Elene', 'email' => 'elene@example.com',
        ])->assertCreated();
        $invited = User::where('email', 'elene@example.com')->firstOrFail();

        $this->asToken($token)->deleteJson("/api/admin/users/{$invited->id}")->assertNoContent();
        $this->assertNull(User::find($invited->id));
    }

    public function test_duplicate_email_is_rejected(): void
    {
        Mail::fake();

        $admin = $this->existingAdmin();
        $token = $this->login($admin->email, 'Existing1pass')['token'];

        $this->asToken($token)
            ->postJson('/api/admin/users', ['name' => 'Nino again', 'email' => 'nino@example.com'])
            ->assertStatus(422);
    }
}

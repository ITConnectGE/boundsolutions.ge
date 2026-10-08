<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// A CV is personal data: it must never be downloadable by URL, only through the
// API with an admin token. The public endpoints are also rate limited.
class CvPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private function submitCv(): Application
    {
        $this->postJson('/api/applications', [
            'type' => 'cv',
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'phone' => '555123456',
            'cv' => UploadedFile::fake()->create('cv.pdf', 12, 'application/pdf'),
        ])->assertCreated();

        return Application::firstOrFail();
    }

    private function adminToken(bool $mustReset = false): string
    {
        User::create([
            'name' => 'Nino',
            'email' => 'nino@example.com',
            'password' => 'Existing1pass',
            'must_reset_password' => $mustReset,
        ]);
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/auth/login', [
            'email' => 'nino@example.com',
            'password' => 'Existing1pass',
        ])->json('token');
    }

    private function asAdmin(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    public function test_an_uploaded_cv_is_stored_privately_and_not_in_the_public_folder(): void
    {
        Mail::fake();
        Storage::fake('local');
        Storage::fake('public');

        $application = $this->submitCv();

        $this->assertNotEmpty($application->cv_path);
        Storage::disk('local')->assertExists($application->cv_path);
        Storage::disk('public')->assertMissing($application->cv_path);
    }

    public function test_the_cv_cannot_be_downloaded_without_an_admin_token(): void
    {
        Mail::fake();
        Storage::fake('local');

        $application = $this->submitCv();

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/applications/{$application->id}/cv")->assertUnauthorized();
    }

    public function test_a_temporary_password_token_cannot_download_it_either(): void
    {
        Mail::fake();
        Storage::fake('local');

        $application = $this->submitCv();
        $token = $this->adminToken(mustReset: true);

        $this->asAdmin($token)->getJson("/api/applications/{$application->id}/cv")->assertForbidden();
    }

    public function test_an_admin_downloads_the_file(): void
    {
        Mail::fake();
        Storage::fake('local');

        $application = $this->submitCv();
        $token = $this->adminToken();

        $res = $this->asAdmin($token)->get("/api/applications/{$application->id}/cv");

        $res->assertOk();
        $this->assertStringContainsString('attachment', (string) $res->headers->get('content-disposition'));
        $this->assertStringContainsString(basename($application->cv_path), (string) $res->headers->get('content-disposition'));
    }

    public function test_a_missing_file_is_a_404_not_a_server_error(): void
    {
        Mail::fake();
        Storage::fake('local');

        $application = $this->submitCv();
        Storage::disk('local')->delete($application->cv_path);
        $token = $this->adminToken();

        $this->asAdmin($token)->get("/api/applications/{$application->id}/cv")->assertNotFound();
    }

    public function test_the_public_form_is_rate_limited(): void
    {
        Mail::fake();

        $payload = [
            'type' => 'contact',
            'name' => 'Bot',
            'email' => 'bot@example.com',
            'phone' => '555123456',
            'message' => 'spam',
        ];

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/applications', $payload)->assertCreated();
        }

        $this->postJson('/api/applications', $payload)->assertStatus(429);
    }

    public function test_login_attempts_are_rate_limited(): void
    {
        User::create([
            'name' => 'Nino',
            'email' => 'nino@example.com',
            'password' => 'Existing1pass',
            'must_reset_password' => false,
        ]);

        // Five wrong guesses for one address is all the limiter allows.
        for ($i = 0; $i < 5; $i++) {
            $this->app['auth']->forgetGuards();
            $this->postJson('/api/auth/login', ['email' => 'nino@example.com', 'password' => 'wrong'])
                ->assertStatus(422);
        }

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['email' => 'nino@example.com', 'password' => 'Existing1pass'])
            ->assertStatus(429);
    }
}

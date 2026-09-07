<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// A vacancy can be hidden from the public page without being deleted: it drops
// out of /api/vacancies but stays in the admin list so it can be switched back.
class VacancyVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        User::create([
            'name' => 'Nino',
            'email' => 'nino@example.com',
            'password' => 'Existing1pass',
            'must_reset_password' => false,
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

    public function test_hidden_vacancies_leave_the_public_list_but_stay_in_the_panel(): void
    {
        $token = $this->adminToken();

        $shown = Vacancy::create(['category' => 'hr', 'title_ka' => 'ღია პოზიცია', 'is_active' => true]);
        $hidden = Vacancy::create(['category' => 'hr', 'title_ka' => 'დამალული პოზიცია', 'is_active' => false]);

        $public = $this->getJson('/api/vacancies')->assertOk()->json();
        $this->assertSame(['ღია პოზიცია'], array_column(array_column($public, 'title'), 'ka'));

        $admin = $this->asAdmin($token)->getJson('/api/admin/vacancies')->assertOk()->json();
        $this->assertCount(2, $admin);
        $this->assertEqualsCanonicalizing(
            ['ღია პოზიცია', 'დამალული პოზიცია'],
            array_column(array_column($admin, 'title'), 'ka'),
        );
        $byId = collect($admin)->keyBy('id');
        $this->assertTrue($byId['v'.$shown->id]['is_active']);
        $this->assertFalse($byId['v'.$hidden->id]['is_active']);
    }

    public function test_the_panel_can_hide_and_republish_a_vacancy(): void
    {
        $token = $this->adminToken();
        $vacancy = Vacancy::create(['category' => 'hr', 'title_ka' => 'ღია პოზიცია', 'is_active' => true]);

        // Hide it - the same multipart shape the panel sends ("0" as a string).
        $this->asAdmin($token)->post("/api/vacancies/{$vacancy->id}", [
            'category' => 'hr',
            'title_ka' => 'ღია პოზიცია',
            'is_active' => '0',
        ])->assertOk();

        $this->assertFalse($vacancy->fresh()->is_active);
        $this->assertSame([], $this->getJson('/api/vacancies')->json());

        // And back on.
        $this->asAdmin($token)->post("/api/vacancies/{$vacancy->id}", [
            'category' => 'hr',
            'title_ka' => 'ღია პოზიცია',
            'is_active' => '1',
        ])->assertOk();

        $this->assertTrue($vacancy->fresh()->is_active);
        $this->assertCount(1, $this->getJson('/api/vacancies')->json());
    }

    public function test_hiding_a_vacancy_keeps_its_image(): void
    {
        $token = $this->adminToken();
        $vacancy = Vacancy::create([
            'category' => 'hr',
            'title_ka' => 'ღია პოზიცია',
            'image_path' => 'vacancies/photo.jpg',
            'is_active' => true,
        ]);

        $this->asAdmin($token)->post("/api/vacancies/{$vacancy->id}", [
            'category' => 'hr',
            'title_ka' => 'ღია პოზიცია',
            'is_active' => '0',
        ])->assertOk();

        $this->assertSame('vacancies/photo.jpg', $vacancy->fresh()->image_path);
    }

    public function test_the_admin_vacancy_list_needs_a_token(): void
    {
        $this->getJson('/api/admin/vacancies')->assertUnauthorized();
    }
}

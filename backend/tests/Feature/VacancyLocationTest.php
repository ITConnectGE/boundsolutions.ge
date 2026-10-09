<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Each vacancy can name its own city. Left empty it stays null, and the site
// falls back to the default label it showed on every vacancy before.
class VacancyLocationTest extends TestCase
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

    public function test_a_city_can_be_saved_and_is_published_in_both_languages(): void
    {
        $token = $this->adminToken();

        $this->asAdmin($token)->post('/api/vacancies', [
            'category' => 'Finance',
            'title_ka' => 'მთავარი ბუღალტერი',
            'location_ka' => 'ბათუმი',
            'location_en' => 'Batumi',
        ])->assertCreated();

        $public = $this->getJson('/api/vacancies')->assertOk()->json();

        $this->assertSame(['ka' => 'ბათუმი', 'en' => 'Batumi'], $public[0]['location']);
    }

    public function test_the_english_city_falls_back_to_the_georgian_one(): void
    {
        $token = $this->adminToken();

        $this->asAdmin($token)->post('/api/vacancies', [
            'category' => 'Finance',
            'title_ka' => 'მთავარი ბუღალტერი',
            'location_ka' => 'ქუთაისი',
        ])->assertCreated();

        $public = $this->getJson('/api/vacancies')->assertOk()->json();

        $this->assertSame(['ka' => 'ქუთაისი', 'en' => 'ქუთაისი'], $public[0]['location']);
    }

    public function test_a_vacancy_without_a_city_reports_none_so_the_site_uses_its_default(): void
    {
        Vacancy::create(['category' => 'Finance', 'title_ka' => 'მთავარი ბუღალტერი', 'is_active' => true]);

        $public = $this->getJson('/api/vacancies')->assertOk()->json();

        $this->assertSame(['ka' => null, 'en' => null], $public[0]['location']);
    }

    public function test_the_city_is_editable_afterwards(): void
    {
        $token = $this->adminToken();
        $vacancy = Vacancy::create([
            'category' => 'Finance',
            'title_ka' => 'მთავარი ბუღალტერი',
            'location_ka' => 'თბილისი',
            'is_active' => true,
        ]);

        $this->asAdmin($token)->post("/api/vacancies/{$vacancy->id}", [
            'category' => 'Finance',
            'title_ka' => 'მთავარი ბუღალტერი',
            'location_ka' => 'ბათუმი',
            'location_en' => 'Batumi',
        ])->assertOk();

        $this->assertSame('ბათუმი', $vacancy->fresh()->location_ka);
        $this->assertSame('Batumi', $vacancy->fresh()->location_en);
    }
}

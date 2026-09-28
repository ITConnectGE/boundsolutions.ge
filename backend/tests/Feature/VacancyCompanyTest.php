<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Two vacancies can share a title ("ოფისის მენეჯერი" twice). The client company
// tells them apart in the admin, and must never leak onto the public site.
class VacancyCompanyTest extends TestCase
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

    public function test_the_company_is_saved_shown_in_the_admin_and_hidden_from_the_public_list(): void
    {
        $token = $this->adminToken();

        $this->asAdmin($token)->post('/api/vacancies', [
            'category' => 'Administration',
            'title_ka' => 'ოფისის მენეჯერი',
            'company' => 'Acme LLC',
        ])->assertCreated();

        $vacancy = Vacancy::firstOrFail();
        $this->assertSame('Acme LLC', $vacancy->company);

        $admin = $this->asAdmin($token)->getJson('/api/admin/vacancies')->assertOk()->json();
        $this->assertSame('Acme LLC', $admin[0]['company']);

        $public = $this->getJson('/api/vacancies')->assertOk();
        $public->assertDontSee('Acme LLC');
        $this->assertArrayNotHasKey('company', $public->json()[0]);
    }

    public function test_an_application_keeps_the_company_of_the_vacancy_it_was_sent_to(): void
    {
        Mail::fake();

        $one = Vacancy::create(['category' => 'Administration', 'title_ka' => 'ოფისის მენეჯერი', 'company' => 'Acme LLC', 'is_active' => true]);
        $two = Vacancy::create(['category' => 'Administration', 'title_ka' => 'ოფისის მენეჯერი', 'company' => 'Globex', 'is_active' => true]);

        foreach ([$one, $two] as $vacancy) {
            $this->postJson('/api/applications', [
                'type' => 'cv',
                'name' => 'Candidate',
                'email' => 'candidate@example.com',
                'phone' => '555123456',
                'position' => 'ოფისის მენეჯერი',
                'vacancy_id' => $vacancy->id,
            ])->assertCreated();
        }

        $companies = Application::orderBy('id')->pluck('company', 'vacancy_id')->all();
        $this->assertSame('Acme LLC', $companies[$one->id]);
        $this->assertSame('Globex', $companies[$two->id]);

        // The copy is what makes the inbox readable later on.
        $two->delete();
        $this->assertSame('Globex', Application::where('vacancy_id', $two->id)->value('company'));
    }

    public function test_naming_the_company_later_fills_it_in_for_the_cvs_already_received(): void
    {
        Mail::fake();
        $token = $this->adminToken();

        // The situation on the site today: two vacancies with the same title and
        // no company, CVs already sitting in the inbox.
        $vacancy = Vacancy::create(['category' => 'Administration', 'title_ka' => 'ოფისის მენეჯერი', 'is_active' => true]);
        $this->postJson('/api/applications', [
            'type' => 'cv',
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'phone' => '555123456',
            'vacancy_id' => $vacancy->id,
        ])->assertCreated();
        $this->assertNull(Application::firstOrFail()->company);

        $this->asAdmin($token)->post("/api/vacancies/{$vacancy->id}", [
            'category' => 'Administration',
            'title_ka' => 'ოფისის მენეჯერი',
            'company' => 'Acme LLC',
        ])->assertOk();

        $this->assertSame('Acme LLC', Application::firstOrFail()->company);
    }

    public function test_an_application_without_a_vacancy_simply_has_no_company(): void
    {
        Mail::fake();

        $this->postJson('/api/applications', [
            'type' => 'cv',
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'phone' => '555123456',
        ])->assertCreated();

        $this->assertNull(Application::firstOrFail()->company);
    }

    public function test_a_company_cannot_be_injected_through_the_public_form(): void
    {
        Mail::fake();

        $vacancy = Vacancy::create(['category' => 'Administration', 'title_ka' => 'ოფისის მენეჯერი', 'company' => 'Acme LLC', 'is_active' => true]);

        $this->postJson('/api/applications', [
            'type' => 'cv',
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'phone' => '555123456',
            'vacancy_id' => $vacancy->id,
            'company' => 'Typed by the visitor',
        ])->assertCreated();

        $this->assertSame('Acme LLC', Application::firstOrFail()->company);
    }
}

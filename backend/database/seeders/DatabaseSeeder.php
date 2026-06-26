<?php

namespace Database\Seeders;

use App\Models\Content;
use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user (same demo credentials the frontend used).
        User::updateOrCreate(
            ['email' => 'nino.bartaia@gmail.com'],
            ['name' => 'Nino Bartaia', 'password' => Hash::make('12345678')]
        );

        // Vacancies — same starter set as the frontend seed.
        $vacancies = [
            ['category' => 'sales', 'title_ka' => 'გაყიდვების მენეჯერი', 'title_en' => 'Sales Manager', 'sector_ka' => 'ღვინის ინდუსტრია', 'sector_en' => 'Wine industry', 'salary' => '2,500–4,000 ₾'],
            ['category' => 'horeca', 'title_ka' => 'სერვის მენეჯერი', 'title_en' => 'Service Manager', 'sector_ka' => 'რესტორანი / სასტუმრო', 'sector_en' => 'Restaurant / Hotel', 'salary' => '2,000–3,500 ₾'],
            ['category' => 'finance', 'title_ka' => 'მთავარი ბუღალტერი', 'title_en' => 'Chief Accountant', 'sector_ka' => 'ფინანსური სექტორი', 'sector_en' => 'Financial sector', 'salary' => '3,000–5,000 ₾'],
            ['category' => 'events', 'title_ka' => 'ივენთ მენეჯერი', 'title_en' => 'Event Manager', 'sector_ka' => 'ივენთ მენეჯმენტი', 'sector_en' => 'Event management', 'salary' => '2,000–3,000 ₾'],
            ['category' => 'hr', 'title_ka' => 'HR გენერალისტი', 'title_en' => 'HR Generalist', 'sector_ka' => 'საერთაშორისო კომპანია', 'sector_en' => 'International company', 'salary' => '2,500–3,500 ₾'],
            ['category' => 'horeca', 'title_ka' => 'შეფ-მზარეული', 'title_en' => 'Head Chef', 'sector_ka' => 'პრემიუმ რესტორანი', 'sector_en' => 'Premium restaurant', 'salary' => '3,000–4,500 ₾'],
        ];
        foreach ($vacancies as $i => $v) {
            Vacancy::updateOrCreate(
                ['title_ka' => $v['title_ka']],
                $v + ['is_active' => true, 'sort_order' => $i]
            );
        }

        // A few editable content rows as a starting point for the CMS.
        $content = [
            ['group' => 'home', 'key' => 'home.hero.slogan1', 'locale' => 'ka', 'value' => 'People First,'],
            ['group' => 'home', 'key' => 'home.hero.slogan2', 'locale' => 'ka', 'value' => 'Success Follows.'],
            ['group' => 'home', 'key' => 'home.hero.subtitle', 'locale' => 'ka', 'value' => 'ვაკავშირებთ ნიჭიერ ადამიანებს სწორ შესაძლებლობებთან.'],
            ['group' => 'home', 'key' => 'home.hero.subtitle', 'locale' => 'en', 'value' => 'We connect talented people with the right opportunities.'],
        ];
        foreach ($content as $c) {
            Content::updateOrCreate(
                ['key' => $c['key'], 'locale' => $c['locale']],
                ['group' => $c['group'], 'type' => 'text', 'value' => $c['value']]
            );
        }
    }
}

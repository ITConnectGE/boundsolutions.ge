<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin accounts. All share the password below — change in production.
        $admins = [
            'nino@gmail.com' => 'Nino',
            'tamar@gmail.com' => 'TamarI',
            'elene@gmail.com' => 'Elene',
            'katerina@gmail.com' => 'Katerina',
        ];
        foreach ($admins as $email => $name) {
            User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => Hash::make('Tbilisi1!')]
            );
        }

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

        // Populate all site texts (ka + en) into the contents table.
        $this->call(ContentSeeder::class);
    }
}

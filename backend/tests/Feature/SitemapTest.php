<?php

namespace Tests\Feature;

use App\Models\Vacancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// /sitemap-vacancies.xml lists every visible vacancy as its final canonical URL.
class SitemapTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_active_vacancies_as_canonical_trailing_slash_urls(): void
    {
        $shown = Vacancy::create(['category' => 'hr', 'title_ka' => 'ღია', 'is_active' => true]);
        $other = Vacancy::create(['category' => 'hr', 'title_ka' => 'ღია 2', 'is_active' => true]);
        $hidden = Vacancy::create(['category' => 'hr', 'title_ka' => 'დამალული', 'is_active' => false]);

        $res = $this->get('/sitemap-vacancies.xml')->assertOk();

        $this->assertStringStartsWith('application/xml', $res->headers->get('Content-Type'));
        $xml = $res->getContent();

        $doc = simplexml_load_string($xml);
        $this->assertNotFalse($doc, 'valid XML');
        $this->assertSame('urlset', $doc->getName());

        $locs = [];
        foreach ($doc->url as $url) {
            $locs[] = (string) $url->loc;
            $this->assertNotEmpty((string) $url->lastmod);
        }

        $this->assertEqualsCanonicalizing([
            "https://boundsolutions.ge/vacancies/{$shown->id}/",
            "https://boundsolutions.ge/vacancies/{$other->id}/",
        ], $locs);
        $this->assertStringNotContainsString("/vacancies/{$hidden->id}/", $xml);
    }

    public function test_it_is_a_valid_empty_urlset_without_vacancies(): void
    {
        $doc = simplexml_load_string($this->get('/sitemap-vacancies.xml')->assertOk()->getContent());

        $this->assertSame('urlset', $doc->getName());
        $this->assertCount(0, $doc->url);
    }

    public function test_a_crawler_request_gets_no_session_or_csrf_cookies(): void
    {
        $res = $this->get('/sitemap-vacancies.xml')->assertOk();

        $this->assertEmpty($res->headers->getCookies());
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Vacancy;
use Illuminate\Http\Response;

// /sitemap-vacancies.xml - one entry per vacancy that is visible on the site, as
// its final canonical URL (https://boundsolutions.ge/vacancies/<id>/). Built per
// request, so a new, edited or hidden vacancy is reflected without a rebuild.
// /sitemap.xml (a sitemap index written at build time) points here.
class SitemapController extends Controller
{
    public function vacancies(): Response
    {
        $base = rtrim((string) config('app.site_url'), '/');

        $entries = Vacancy::where('is_active', true)
            ->orderBy('sort_order')
            ->latest('id')
            ->get(['id', 'updated_at'])
            ->map(function (Vacancy $v) use ($base) {
                $loc = e("{$base}/vacancies/{$v->id}/");
                $lastmod = $v->updated_at ? "<lastmod>{$v->updated_at->toAtomString()}</lastmod>" : '';

                return "  <url><loc>{$loc}</loc>{$lastmod}</url>";
            })
            ->implode("\n");

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .($entries !== '' ? $entries."\n" : '')
            .'</urlset>'."\n";

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=600',
        ]);
    }
}

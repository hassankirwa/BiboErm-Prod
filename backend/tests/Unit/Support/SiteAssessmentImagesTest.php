<?php

namespace Tests\Unit\Support;

use App\Support\SiteAssessmentImages;
use Tests\TestCase;

class SiteAssessmentImagesTest extends TestCase
{
    public function test_enrich_urls_resolves_private_paths(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $path = 'private/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png';

        $enriched = SiteAssessmentImages::enrichUrls([
            'additional_images' => [
                ['path' => $path, 'url' => null, 'original_name' => 'photo.png'],
            ],
            'balconies' => [
                [
                    'label' => 'Balcony 1',
                    'images' => [
                        ['path' => $path, 'url' => '/api/files/old', 'original_name' => 'b.png'],
                    ],
                ],
            ],
        ]);

        $expected = 'http://localhost:8000/api/v1/files/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png';

        $this->assertSame($expected, $enriched['additional_images'][0]['url']);
        $this->assertSame($expected, $enriched['balconies'][0]['images'][0]['url']);
    }
}

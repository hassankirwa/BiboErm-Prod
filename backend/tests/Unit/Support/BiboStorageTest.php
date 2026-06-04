<?php

namespace Tests\Unit\Support;

use App\Support\BiboStorage;
use Tests\TestCase;

class BiboStorageTest extends TestCase
{
    public function test_resolve_private_api_url_uses_v1_prefix(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $url = BiboStorage::resolvePrivateApiUrl(
            'private/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png',
        );

        $this->assertSame(
            'http://localhost:8000/api/v1/files/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png',
            $url,
        );
    }

    public function test_resolve_stored_url_prefers_public_then_private(): void
    {
        config(['app.url' => 'http://localhost:8000', 'bibo.storage.url' => null]);

        $public = BiboStorage::resolveStoredUrl('public/profiles/5/avatar-u5-abc.png');
        $this->assertSame('http://localhost:8000/media/profiles/5/avatar-u5-abc.png', $public);

        $private = BiboStorage::resolveStoredUrl(
            'private/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png',
        );
        $this->assertSame(
            'http://localhost:8000/api/v1/files/site-assessment/project-1/site-assessment-uproject-1-01ksz8m97fmen435yyjekqbp5x.png',
            $private,
        );
    }
}

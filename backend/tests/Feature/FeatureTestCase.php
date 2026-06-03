<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

abstract class FeatureTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        /*
         * Array cache survives across PHPUnit test methods in-process; named limit keys (IP-based)
         * accumulate and cause flaky 429 responses on auth routes exercised across the suite.
         */
        $this->withoutMiddleware(ThrottleRequests::class);

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.username' => 'test',
            'mail.mailers.smtp.password' => 'secret',
        ]);
    }
}

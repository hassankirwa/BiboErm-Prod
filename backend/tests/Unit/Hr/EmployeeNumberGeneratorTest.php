<?php

namespace Tests\Unit\Hr;

use App\Models\EmployeeProfile;
use App\Models\User;
use App\Services\Hr\EmployeeNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_suggests_next_bwd_number_without_hyphen(): void
    {
        config([
            'bibo.hr.employee_number_prefix' => 'BWD',
            'bibo.hr.employee_number_pad' => 4,
            'bibo.hr.employee_number_hyphen' => false,
        ]);

        $user = User::factory()->create();
        EmployeeProfile::query()->create([
            'user_id' => $user->id,
            'employee_number' => 'BWD1073',
        ]);

        $legacyUser = User::factory()->create();
        EmployeeProfile::query()->create([
            'user_id' => $legacyUser->id,
            'employee_number' => 'EMP-0001',
        ]);

        $suggested = app(EmployeeNumberGenerator::class)->suggest();

        $this->assertSame('BWD1074', $suggested);
    }
}

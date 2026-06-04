<?php

namespace Tests\Unit\Support;

use App\Support\SiteAssessmentData;
use Tests\TestCase;

class SiteAssessmentDataTest extends TestCase
{
    public function test_it_detects_operational_counts(): void
    {
        $this->assertTrue(SiteAssessmentData::hasOperationalData([
            'doors_count' => 2,
        ]));
    }

    public function test_it_detects_operational_items(): void
    {
        $this->assertTrue(SiteAssessmentData::hasOperationalData([
            'windows' => [
                ['label' => 'Kitchen', 'width_ft' => 4, 'height_ft' => 5],
            ],
        ]));
    }

    public function test_it_detects_operational_notes(): void
    {
        $this->assertTrue(SiteAssessmentData::hasOperationalData([
            'operational_notes' => 'Limited crane access on east side.',
        ]));
    }

    public function test_it_rejects_empty_or_sales_only_data(): void
    {
        $this->assertFalse(SiteAssessmentData::hasOperationalData(null));
        $this->assertFalse(SiteAssessmentData::hasOperationalData([]));
        $this->assertFalse(SiteAssessmentData::hasOperationalData([
            'rooms_count' => 3,
            'findings_notes' => 'Sales visit notes only.',
        ]));
    }
}

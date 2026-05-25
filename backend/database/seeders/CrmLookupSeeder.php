<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CrmLookupSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedLookup('crm_lead_sources', [
            ['slug' => 'walk_in', 'label' => 'Walk-in'],
            ['slug' => 'website', 'label' => 'Website'],
            ['slug' => 'whatsapp', 'label' => 'WhatsApp'],
            ['slug' => 'referral', 'label' => 'Referral'],
            ['slug' => 'field_visit', 'label' => 'Field Visit'],
            ['slug' => 'call', 'label' => 'Phone Call'],
            ['slug' => 'social_media', 'label' => 'Social Media'],
            ['slug' => 'existing_client', 'label' => 'Existing Client'],
            ['slug' => 'campaign', 'label' => 'Campaign'],
            ['slug' => 'reception', 'label' => 'Reception'],
        ]);

        $this->seedLookup('crm_lead_types', [
            ['slug' => 'individual', 'label' => 'Individual'],
            ['slug' => 'contractor', 'label' => 'Contractor'],
            ['slug' => 'architect', 'label' => 'Architect'],
            ['slug' => 'developer', 'label' => 'Developer'],
            ['slug' => 'estate', 'label' => 'Estate'],
            ['slug' => 'company', 'label' => 'Company'],
            ['slug' => 'government', 'label' => 'Government'],
            ['slug' => 'other', 'label' => 'Other'],
        ]);

        $this->seedLookup('crm_product_interests', [
            ['slug' => 'blinds', 'label' => 'Blinds'],
            ['slug' => 'curtains', 'label' => 'Curtains'],
            ['slug' => 'glass', 'label' => 'Glass'],
            ['slug' => 'aluminium', 'label' => 'Aluminium'],
            ['slug' => 'flooring', 'label' => 'Flooring'],
            ['slug' => 'interior_works', 'label' => 'Interior Works'],
            ['slug' => 'custom', 'label' => 'Custom'],
        ]);

        $this->seedLookup('crm_counties', [
            ['slug' => 'nairobi', 'label' => 'Nairobi'],
            ['slug' => 'mombasa', 'label' => 'Mombasa'],
            ['slug' => 'kisumu', 'label' => 'Kisumu'],
            ['slug' => 'nakuru', 'label' => 'Nakuru'],
            ['slug' => 'kiambu', 'label' => 'Kiambu'],
            ['slug' => 'machakos', 'label' => 'Machakos'],
            ['slug' => 'kajiado', 'label' => 'Kajiado'],
        ]);

        $this->seedLookup('crm_loss_reasons', [
            ['slug' => 'price', 'label' => 'Price'],
            ['slug' => 'competitor', 'label' => 'Competitor'],
            ['slug' => 'timeline', 'label' => 'Timeline'],
            ['slug' => 'no_budget', 'label' => 'No Budget'],
            ['slug' => 'no_response', 'label' => 'No Response'],
            ['slug' => 'other', 'label' => 'Other'],
        ]);

        $this->seedLookup('crm_visit_purposes', [
            ['slug' => 'measurement', 'label' => 'Measurement'],
            ['slug' => 'inspection', 'label' => 'Inspection'],
            ['slug' => 'follow_up', 'label' => 'Follow-up'],
            ['slug' => 'installation_survey', 'label' => 'Installation Survey'],
        ]);
    }

    protected function seedLookup(string $table, array $rows): void
    {
        foreach ($rows as $row) {
            DB::table($table)->updateOrInsert(
                ['slug' => $row['slug']],
                [
                    'label' => $row['label'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}

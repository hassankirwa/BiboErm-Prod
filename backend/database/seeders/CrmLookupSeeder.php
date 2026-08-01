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
            ['slug' => 'doors', 'label' => 'Doors'],
            ['slug' => 'windows', 'label' => 'Windows'],
            ['slug' => 'bathrooms', 'label' => 'Bathrooms'],
            ['slug' => 'balconies', 'label' => 'Balconies'],
            ['slug' => 'flooring', 'label' => 'Flooring'],
            ['slug' => 'interior_works', 'label' => 'Interior Works'],
            ['slug' => 'custom', 'label' => 'Custom'],
        ]);

        $this->seedLookup('crm_counties', [
            ['slug' => 'mombasa', 'label' => 'Mombasa'],
            ['slug' => 'kwale', 'label' => 'Kwale'],
            ['slug' => 'kilifi', 'label' => 'Kilifi'],
            ['slug' => 'tana-river', 'label' => 'Tana River'],
            ['slug' => 'lamu', 'label' => 'Lamu'],
            ['slug' => 'taita-taveta', 'label' => 'Taita Taveta'],
            ['slug' => 'garissa', 'label' => 'Garissa'],
            ['slug' => 'wajir', 'label' => 'Wajir'],
            ['slug' => 'mandera', 'label' => 'Mandera'],
            ['slug' => 'marsabit', 'label' => 'Marsabit'],
            ['slug' => 'isiolo', 'label' => 'Isiolo'],
            ['slug' => 'meru', 'label' => 'Meru'],
            ['slug' => 'tharaka-nithi', 'label' => 'Tharaka Nithi'],
            ['slug' => 'embu', 'label' => 'Embu'],
            ['slug' => 'kitui', 'label' => 'Kitui'],
            ['slug' => 'machakos', 'label' => 'Machakos'],
            ['slug' => 'makueni', 'label' => 'Makueni'],
            ['slug' => 'nyandarua', 'label' => 'Nyandarua'],
            ['slug' => 'nyeri', 'label' => 'Nyeri'],
            ['slug' => 'kirinyaga', 'label' => 'Kirinyaga'],
            ['slug' => 'muranga', 'label' => "Murang'a"],
            ['slug' => 'kiambu', 'label' => 'Kiambu'],
            ['slug' => 'turkana', 'label' => 'Turkana'],
            ['slug' => 'west-pokot', 'label' => 'West Pokot'],
            ['slug' => 'samburu', 'label' => 'Samburu'],
            ['slug' => 'trans-nzoia', 'label' => 'Trans Nzoia'],
            ['slug' => 'uasin-gishu', 'label' => 'Uasin Gishu'],
            ['slug' => 'elgeyo-marakwet', 'label' => 'Elgeyo Marakwet'],
            ['slug' => 'nandi', 'label' => 'Nandi'],
            ['slug' => 'baringo', 'label' => 'Baringo'],
            ['slug' => 'laikipia', 'label' => 'Laikipia'],
            ['slug' => 'nakuru', 'label' => 'Nakuru'],
            ['slug' => 'narok', 'label' => 'Narok'],
            ['slug' => 'kajiado', 'label' => 'Kajiado'],
            ['slug' => 'kericho', 'label' => 'Kericho'],
            ['slug' => 'bomet', 'label' => 'Bomet'],
            ['slug' => 'kakamega', 'label' => 'Kakamega'],
            ['slug' => 'vihiga', 'label' => 'Vihiga'],
            ['slug' => 'bungoma', 'label' => 'Bungoma'],
            ['slug' => 'busia', 'label' => 'Busia'],
            ['slug' => 'siaya', 'label' => 'Siaya'],
            ['slug' => 'kisumu', 'label' => 'Kisumu'],
            ['slug' => 'homa-bay', 'label' => 'Homa Bay'],
            ['slug' => 'migori', 'label' => 'Migori'],
            ['slug' => 'kisii', 'label' => 'Kisii'],
            ['slug' => 'nyamira', 'label' => 'Nyamira'],
            ['slug' => 'nairobi', 'label' => 'Nairobi'],
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

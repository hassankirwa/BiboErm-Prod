<?php

namespace Database\Seeders;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CrmSeeder extends Seeder
{
    public function run(): void
    {
        $salesRep = User::query()->where('email', 'sales@bibo.local')->first();
        $fieldOfficer = User::query()->where('email', 'field@bibo.local')->first();

        $walkIn = DB::table('crm_lead_sources')->where('slug', 'walk_in')->value('id');
        $individual = DB::table('crm_lead_types')->where('slug', 'individual')->value('id');
        $company = DB::table('crm_lead_types')->where('slug', 'company')->value('id');
        $nairobi = DB::table('crm_counties')->where('slug', 'nairobi')->value('id');

        $leads = [
            [
                'reference' => 'LD-DEMO001',
                'lead_number' => 'LD-2026-0001',
                'name' => 'James Kariuki',
                'first_name' => 'James',
                'last_name' => 'Kariuki',
                'contact_person_name' => 'James Kariuki',
                'company' => 'Westlands Apartments Ltd',
                'account_name' => 'Westlands Apartments Ltd',
                'email' => 'james@westlands-apts.co.ke',
                'phone' => '+254712345678',
                'source' => 'field_visit',
                'lead_source_id' => $walkIn,
                'lead_type_id' => $company,
                'status' => LeadStatus::Qualified->value,
                'estimated_value' => 450000,
                'estimated_budget' => 450000,
                'requirement_description' => 'Roller blinds for 24 apartment units',
                'product_interests' => ['blinds', 'curtains'],
                'site_address' => 'Westlands, Nairobi',
                'county_id' => $nairobi,
                'need_site_visit' => true,
                'next_action' => 'call',
                'next_follow_up_at' => now()->addDays(2),
            ],
            [
                'reference' => 'LD-DEMO002',
                'lead_number' => 'LD-2026-0002',
                'name' => 'Mary Wanjiku',
                'first_name' => 'Mary',
                'last_name' => 'Wanjiku',
                'contact_person_name' => 'Mary Wanjiku',
                'company' => null,
                'account_name' => null,
                'email' => 'mary.w@example.com',
                'phone' => '+254798765432',
                'source' => 'reception',
                'lead_source_id' => $walkIn,
                'lead_type_id' => $individual,
                'status' => LeadStatus::New->value,
                'estimated_value' => 180000,
                'estimated_budget' => 180000,
                'requirement_description' => 'Aluminium windows for residential renovation',
                'product_interests' => ['aluminium', 'glass'],
                'need_site_visit' => false,
            ],
        ];

        foreach ($leads as $leadData) {
            Lead::query()->updateOrCreate(
                ['reference' => $leadData['reference']],
                [
                    ...$leadData,
                    'lead_owner_id' => $salesRep?->id,
                    'assigned_sales_user_id' => $salesRep?->id,
                    'assigned_field_officer_id' => $fieldOfficer?->id,
                    'assigned_to' => $salesRep?->id,
                    'created_by' => $salesRep?->id,
                ],
            );
        }

        $qualifiedLead = Lead::query()->where('reference', 'LD-DEMO001')->first();

        if ($qualifiedLead && $salesRep) {
            $account = Account::query()->updateOrCreate(
                ['account_number' => 'AC-2026-0001'],
                [
                    'name' => 'Westlands Apartments Ltd',
                    'industry' => 'Real Estate',
                    'phone' => '+254712345678',
                    'email' => 'james@westlands-apts.co.ke',
                    'status' => 'active_opportunity',
                    'account_owner_id' => $salesRep->id,
                    'owner_id' => $salesRep->id,
                    'source_lead_id' => $qualifiedLead->id,
                    'created_by' => $salesRep->id,
                ],
            );

            $contact = Contact::query()->updateOrCreate(
                ['contact_number' => 'CT-2026-0001'],
                [
                    'name' => 'James Kariuki',
                    'first_name' => 'James',
                    'last_name' => 'Kariuki',
                    'phone' => '+254712345678',
                    'email' => 'james@westlands-apts.co.ke',
                    'account_id' => $account->id,
                    'contact_owner_id' => $salesRep->id,
                    'owner_id' => $salesRep->id,
                    'source_lead_id' => $qualifiedLead->id,
                    'status' => 'active',
                    'created_by' => $salesRep->id,
                ],
            );

            $account->update(['primary_contact_id' => $contact->id]);

            Deal::query()->updateOrCreate(
                ['reference' => 'DL-DEMO001'],
                [
                    'deal_number' => 'DL-2026-0001',
                    'title' => 'Westlands Apartments Roller Blinds',
                    'name' => 'Westlands Apartments Roller Blinds',
                    'account_id' => $account->id,
                    'contact_id' => $contact->id,
                    'primary_contact_id' => $contact->id,
                    'lead_id' => $qualifiedLead->id,
                    'source_lead_id' => $qualifiedLead->id,
                    'stage' => DealStage::QuotationPreparation->value,
                    'status' => 'open',
                    'amount' => 450000,
                    'estimated_value' => 450000,
                    'owner_id' => $salesRep->id,
                    'deal_owner_id' => $salesRep->id,
                    'created_by' => $salesRep->id,
                    'requirement_summary' => 'Roller blinds for 24 apartment units',
                ],
            );
        }
    }
}

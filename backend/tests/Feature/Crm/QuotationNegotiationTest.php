<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\QuotationStatus;
use App\Enums\ProjectStage;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Quotation;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class QuotationNegotiationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            CrmLookupSeeder::class,
        ]);

        $this->user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->user->assignRole('sales_representative');

        $contact = Contact::query()->create([
            'first_name' => 'Negotiation',
            'last_name' => 'Client',
            'name' => 'Negotiation Client',
            'phone' => '+254700000099',
            'status' => 'active',
        ]);

        $this->account = Account::query()->create([
            'account_number' => 'ACC-NEG-001',
            'name' => 'Negotiation Account',
            'status' => 'prospect',
            'primary_contact_id' => $contact->id,
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);
    }

    protected function createDraftQuotation(): Quotation
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson("/api/v1/crm/accounts/{$this->account->id}/quotations", [
            'lines' => [
                [
                    'description' => 'Office blinds package',
                    'quantity' => 1,
                    'unit_price' => 500000,
                ],
            ],
        ]);

        $response->assertCreated();

        return Quotation::query()->findOrFail($response->json('data.id'));
    }

    public function test_send_marks_quotation_sent_and_creates_deal(): void
    {
        $quotation = $this->createDraftQuotation();

        $response = $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send");

        $response->assertOk()
            ->assertJsonPath('data.status', QuotationStatus::Sent->value)
            ->assertJsonPath('data.revision_number', 1)
            ->assertJsonPath('data.revision_label', 'v1');

        $quotation->refresh();
        $this->assertNotNull($quotation->sent_at);
        $this->assertNotNull($quotation->deal_id);
        $this->assertSame($quotation->id, $quotation->root_quotation_id);

        $this->assertDatabaseHas('deals', [
            'id' => $quotation->deal_id,
            'stage' => DealStage::QuotationSent->value,
        ]);
    }

    public function test_negotiation_notes_append_after_sent(): void
    {
        $quotation = $this->createDraftQuotation();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();

        $response = $this->postJson("/api/v1/crm/quotations/{$quotation->id}/negotiation-notes", [
            'body' => 'Client requested 10% discount on total.',
        ]);

        $response->assertOk()
            ->assertJsonCount(1, 'data.negotiation_notes')
            ->assertJsonPath('data.negotiation_notes.0.body', 'Client requested 10% discount on total.');

        $quotation->refresh();
        $this->assertSame(DealStage::NegotiationRevision->value, $quotation->deal->stage->value);
    }

    public function test_negotiation_notes_rejected_before_sent(): void
    {
        $quotation = $this->createDraftQuotation();

        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/negotiation-notes", [
            'body' => 'Too early',
        ])->assertStatus(422);
    }

    public function test_revise_creates_new_revision_and_preserves_reference_copy(): void
    {
        $quotation = $this->createDraftQuotation();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/negotiation-notes", [
            'body' => 'Needs revision',
        ])->assertOk();

        $originalId = $quotation->id;

        $response = $this->postJson("/api/v1/crm/quotations/{$quotation->id}/revise");

        $response->assertOk()
            ->assertJsonPath('data.status', QuotationStatus::Draft->value)
            ->assertJsonPath('data.revision_number', 2)
            ->assertJsonPath('data.revision_label', 'v2')
            ->assertJsonCount(1, 'data.negotiation_notes');

        $newId = $response->json('data.id');
        $this->assertNotSame($originalId, $newId);

        $this->assertDatabaseHas('quotations', [
            'id' => $originalId,
            'is_reference_copy' => true,
            'revision_number' => 1,
            'status' => QuotationStatus::Sent->value,
        ]);

        $this->assertDatabaseHas('quotations', [
            'id' => $newId,
            'is_reference_copy' => false,
            'revision_number' => 2,
            'revision_of_id' => $originalId,
        ]);
    }

    public function test_index_excludes_reference_copies(): void
    {
        $quotation = $this->createDraftQuotation();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/revise")->assertOk();

        $response = $this->getJson('/api/v1/projects/quotations');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($quotation->id, $ids);
    }

    public function test_show_with_history_includes_reference_copies(): void
    {
        $quotation = $this->createDraftQuotation();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();
        $revise = $this->postJson("/api/v1/crm/quotations/{$quotation->id}/revise")->assertOk();
        $newId = $revise->json('data.id');

        $response = $this->getJson("/api/v1/crm/quotations/{$newId}?include=history");

        $response->assertOk()
            ->assertJsonPath('data.revision_number', 2)
            ->assertJsonCount(1, 'data.revision_history')
            ->assertJsonPath('data.revision_history.0.id', $quotation->id)
            ->assertJsonPath('data.revision_history.0.is_reference_copy', true)
            ->assertJsonPath('data.revision_history.0.revision_label', 'v1');
    }

    public function test_deposit_payment_on_won_deal_creates_project_with_deposit_received(): void
    {
        $quotation = $this->createDraftQuotation();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();
        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/accept")->assertOk();

        $quotation->refresh();
        $deal = Deal::query()->findOrFail($quotation->deal_id);
        $deal->update([
            'stage' => DealStage::Won->value,
            'status' => 'won',
            'deposit_required_amount' => 250000,
        ]);

        $response = $this->postJson("/api/v1/crm/deals/{$deal->id}/payments", [
            'payment_reference' => 'MPESA-DEP-001',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 250000,
            'payment_method' => 'mpesa',
            'quotation_id' => $quotation->id,
        ]);

        $response->assertCreated();

        $deal->refresh();
        $this->assertNotNull($deal->project_id);

        $this->assertDatabaseHas('projects', [
            'id' => $deal->project_id,
            'deal_id' => $deal->id,
            'stage' => ProjectStage::DepositReceived->value,
            'is_active' => true,
        ]);
    }

    public function test_send_quotation_links_source_lead_and_exposes_sales_context_on_lead_show(): void
    {
        $lead = \App\Models\Lead::query()->create([
            'reference' => 'LD-NEG-LINK',
            'lead_number' => 'LD-NEG-LINK',
            'name' => 'Negotiation Lead',
            'first_name' => 'Negotiation',
            'status' => \App\Enums\Crm\LeadStatus::AccountCreated->value,
            'converted_account_id' => $this->account->id,
            'lead_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $this->account->update(['source_lead_id' => $lead->id]);

        $quotation = $this->createDraftQuotation();

        $this->postJson("/api/v1/crm/quotations/{$quotation->id}/send")->assertOk();

        $lead->refresh();
        $quotation->refresh();

        $this->assertSame($quotation->deal_id, $lead->converted_deal_id);

        $response = $this->getJson("/api/v1/crm/leads/{$lead->id}");

        $response->assertOk()
            ->assertJsonPath('data.latest_quotation.id', $quotation->id)
            ->assertJsonPath('data.latest_quotation.status', QuotationStatus::Sent->value)
            ->assertJsonPath('data.sales_deal.id', $quotation->deal_id)
            ->assertJsonPath('data.sales_deal.stage', DealStage::QuotationSent->value);
    }
}

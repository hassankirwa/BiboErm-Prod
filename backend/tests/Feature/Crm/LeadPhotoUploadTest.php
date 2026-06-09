<?php

namespace Tests\Feature\Crm;

use App\Models\Lead;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class LeadPhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected User $fieldOfficer;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            CrmLookupSeeder::class,
        ]);

        $this->salesRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->salesRep->assignRole('sales_representative');

        $this->fieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->fieldOfficer->assignRole('field_officer');
    }

    public function test_user_with_leads_create_can_upload_photo_after_creating_lead(): void
    {
        Sanctum::actingAs($this->fieldOfficer);

        $leadTypeId = DB::table('crm_lead_types')->value('id');
        $leadSourceId = DB::table('crm_lead_sources')->value('id');

        $createLead = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Field officer lead',
            'lead_type_id' => $leadTypeId,
            'lead_source_id' => $leadSourceId,
            'lead_owner_id' => $this->fieldOfficer->id,
        ]);

        $createLead->assertCreated();
        $leadId = $createLead->json('data.id');

        Storage::fake('local');

        $upload = $this->postJson("/api/v1/crm/leads/{$leadId}/photos", [
            'file' => UploadedFile::fake()->create('site.jpg', 100, 'image/jpeg'),
            'sort_order' => 0,
        ]);

        $upload->assertCreated();

        $this->assertDatabaseHas('lead_photos', [
            'lead_id' => $leadId,
            'sort_order' => 0,
            'uploaded_by' => $this->fieldOfficer->id,
        ]);
    }

    public function test_lead_show_includes_photos_with_urls(): void
    {
        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-PHOTO-001',
            'lead_number' => 'LD-PHOTO-001',
            'name' => 'Photo lead',
            'first_name' => 'Photo',
            'status' => 'new',
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Storage::fake('local');

        $this->postJson("/api/v1/crm/leads/{$lead->id}/photos", [
            'file' => UploadedFile::fake()->create('site.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        $show = $this->getJson("/api/v1/crm/leads/{$lead->id}");

        $show->assertOk();
        $show->assertJsonPath('data.photos.0.id', fn ($id) => $id > 0);
        $show->assertJsonPath(
            'data.photos.0.url',
            fn ($url) => is_string($url)
                && str_contains($url, "/api/v1/files/crm-attachments/lead-{$lead->id}/"),
        );
        $show->assertJsonPath(
            'data.photos.0.file_path',
            fn ($path) => is_string($path)
                && preg_match('#^private/crm-attachments/lead-\d+/[^/]+$#', $path) === 1,
        );
    }
}

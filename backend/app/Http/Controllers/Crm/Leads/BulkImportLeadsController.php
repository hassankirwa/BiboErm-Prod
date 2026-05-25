<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Crm\Leads\LeadNumberGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BulkImportLeadsController extends Controller
{
    public function __construct(
        protected LeadNumberGenerator $leadNumberGenerator,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', Lead::class);

        $validated = $request->validate([
            'leads' => ['required', 'array', 'min:1', 'max:500'],
            'leads.*.name' => ['required', 'string', 'max:255'],
            'leads.*.contact_person_name' => ['nullable', 'string', 'max:255'],
            'leads.*.phone' => ['required', 'string', 'max:50'],
            'leads.*.email' => ['nullable', 'email', 'max:255'],
            'leads.*.account_name' => ['nullable', 'string', 'max:255'],
            'leads.*.site_address' => ['nullable', 'string'],
            'leads.*.source' => ['nullable', 'string', 'max:64'],
            'leads.*.estimated_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $created = [];

        foreach ($validated['leads'] as $row) {
            $leadNumber = $this->leadNumberGenerator->generate();
            $name = $row['contact_person_name'] ?? $row['name'];

            $lead = Lead::query()->create([
                'name' => $row['name'],
                'contact_person_name' => $name,
                'phone' => $row['phone'],
                'email' => $row['email'] ?? null,
                'account_name' => $row['account_name'] ?? null,
                'site_address' => $row['site_address'] ?? null,
                'source' => $row['source'] ?? null,
                'estimated_value' => $row['estimated_value'] ?? null,
                'reference' => $leadNumber,
                'lead_number' => $leadNumber,
                'status' => 'new',
                'need_site_visit' => false,
                'product_interests' => ['custom'],
                'requirement_description' => $row['name'],
                'lead_owner_id' => $user->id,
                'assigned_to' => $user->id,
                'created_by' => $user->id,
                'first_name' => explode(' ', trim($name))[0] ?? $name,
            ]);

            $created[] = ['id' => $lead->id, 'lead_number' => $lead->lead_number, 'name' => $lead->name];
        }

        return response()->json([
            'data' => [
                'imported' => count($created),
                'leads' => $created,
            ],
        ], 201);
    }
}

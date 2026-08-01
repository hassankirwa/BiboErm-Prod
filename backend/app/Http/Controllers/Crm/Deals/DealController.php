<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class DealController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Deal::class);

        $query = Deal::query()
            ->visibleTo($request->user())
            ->with([
                'contact',
                'account',
                'owner',
                'quotations' => fn ($q) => $q->excludingReferenceCopies()->with('lines')->latest('id'),
            ])
            ->latest();

        if ($stage = $request->query('stage')) {
            $query->where('stage', $stage);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return DealResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): DealResource
    {
        $this->authorize('create', Deal::class);

        $validated = $request->validate([
            'name' => ['required_without:title', 'nullable', 'string', 'max:255'],
            'title' => ['required_without:name', 'nullable', 'string', 'max:255'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'primary_contact_id' => ['nullable', 'exists:contacts,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'lead_id' => ['nullable', 'exists:leads,id'],
            'source_lead_id' => ['nullable', 'exists:leads,id'],
            'stage' => ['nullable', 'string', 'max:64'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
            'deposit_required_amount' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'product_interests' => ['nullable', 'array'],
            'requirement_summary' => ['nullable', 'string'],
            'site_address' => ['nullable', 'string'],
            'assigned_field_officer_id' => ['nullable', 'exists:users,id'],
        ]);

        $user = $request->user();
        $reference = 'DL-'.strtoupper(Str::random(8));
        $name = $validated['name'] ?? $validated['title'];

        $contactId = $validated['primary_contact_id'] ?? $validated['contact_id'] ?? null;
        if ($contactId && empty($validated['primary_contact_id'])) {
            $validated['primary_contact_id'] = $contactId;
        }
        if ($contactId && empty($validated['contact_id'])) {
            $validated['contact_id'] = $contactId;
        }

        if (empty($validated['account_id']) && $contactId) {
            $contact = Contact::query()->find($contactId);
            if ($contact?->account_id) {
                $validated['account_id'] = $contact->account_id;
            }
        }

        if (empty($validated['account_id'])) {
            throw ValidationException::withMessages([
                'account_id' => ['An account is required for every deal.'],
            ]);
        }

        $deal = Deal::query()->create([
            ...$validated,
            'reference' => $reference,
            'deal_number' => $reference,
            'title' => $name,
            'name' => $name,
            'owner_id' => $user->id,
            'deal_owner_id' => $user->id,
            'status' => 'open',
            'stage' => $validated['stage'] ?? 'new_deal',
            'created_by' => $user->id,
        ]);

        return new DealResource($deal->load(['contact', 'account', 'owner', 'assignedFieldOfficer']));
    }

    public function show(Deal $deal): DealResource
    {
        $this->authorize('view', $deal);

        return new DealResource(
            $deal->load([
                'contact',
                'account',
                'owner',
                'assignedFieldOfficer',
                'project',
                'quotations.lines',
                'payments.receivedBy',
                'siteVisits',
            ])
        );
    }

    public function update(Request $request, Deal $deal): DealResource
    {
        $this->authorize('update', $deal);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:255'],
            'account_id' => ['sometimes', 'exists:accounts,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'primary_contact_id' => ['nullable', 'exists:contacts,id'],
            'stage' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'string', 'in:open,won,lost'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
            'deposit_required_amount' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'expected_installation_date' => ['nullable', 'date'],
            'product_interests' => ['nullable', 'array'],
            'requirement_summary' => ['nullable', 'string'],
            'site_address' => ['nullable', 'string'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'discount_requested' => ['nullable', 'numeric', 'min:0'],
            'final_agreed_amount' => ['nullable', 'numeric', 'min:0'],
            'lost_reason' => ['nullable', 'string'],
            'loss_notes' => ['nullable', 'string'],
            'loss_reason_id' => ['nullable', 'exists:crm_loss_reasons,id'],
            'assigned_field_officer_id' => ['nullable', 'exists:users,id'],
        ]);

        if (isset($validated['name'])) {
            $validated['title'] = $validated['name'];
        }

        $deal->update($validated);

        return new DealResource($deal->fresh()->load(['contact', 'account', 'owner', 'assignedFieldOfficer']));
    }
}

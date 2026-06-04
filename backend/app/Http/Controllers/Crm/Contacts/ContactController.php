<?php

namespace App\Http\Controllers\Crm\Contacts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\ContactResource;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class ContactController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Contact::class);

        $query = Contact::query()
            ->visibleTo($request->user())
            ->with(['account', 'owner'])
            ->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        if ($accountId = $request->query('account_id')) {
            $query->where('account_id', $accountId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return ContactResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): ContactResource
    {
        $this->authorize('create', Contact::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'preferred_contact_method' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'contact_owner_id' => ['nullable', 'exists:users,id'],
            'source_lead_id' => ['nullable', 'exists:leads,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $name = $validated['name'];
        $parts = preg_split('/\s+/', trim($name), 2) ?: [];

        $contact = Contact::query()->create([
            ...$validated,
            'contact_number' => 'CT-'.strtoupper(Str::random(8)),
            'first_name' => $validated['first_name'] ?? ($parts[0] ?? $name),
            'last_name' => $validated['last_name'] ?? ($parts[1] ?? null),
            'status' => $validated['status'] ?? 'new_contact',
            'contact_owner_id' => $validated['contact_owner_id'] ?? $user->id,
            'owner_id' => $validated['contact_owner_id'] ?? $user->id,
            'created_by' => $user->id,
        ]);

        return new ContactResource($contact->load(['account', 'owner', 'sourceLead']));
    }

    public function show(Contact $contact): ContactResource
    {
        $this->authorize('view', $contact);

        return new ContactResource($contact->load(['account', 'owner', 'sourceLead']));
    }

    public function update(Request $request, Contact $contact): ContactResource
    {
        $this->authorize('update', $contact);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'preferred_contact_method' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'source_lead_id' => ['nullable', 'exists:leads,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $contact->update($validated);

        return new ContactResource($contact->fresh()->load(['account', 'owner', 'sourceLead']));
    }
}

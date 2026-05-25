<?php

namespace App\Http\Controllers\Crm\Accounts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\AccountResource;
use App\Http\Resources\Crm\DealResource;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AccountController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Account::class);

        $query = Account::query()->with(['owner', 'primaryContact'])->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        return AccountResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function show(Account $account): AccountResource
    {
        $this->authorize('view', $account);

        return new AccountResource($account->load(['owner', 'primaryContact', 'contacts']));
    }

    public function update(Request $request, Account $account): AccountResource
    {
        $this->authorize('update', $account);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'account_type' => ['nullable', 'string', 'max:50'],
            'industry' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'kra_pin' => ['nullable', 'string', 'max:50'],
            'billing_address' => ['nullable', 'string'],
            'physical_address' => ['nullable', 'string'],
            'county_id' => ['nullable', 'exists:crm_counties,id'],
            'status' => ['nullable', 'string', 'max:50'],
            'primary_contact_id' => ['nullable', 'exists:contacts,id'],
        ]);

        $account->update($validated);

        return new AccountResource($account->fresh()->load(['owner', 'primaryContact', 'contacts']));
    }

    public function deals(Account $account): AnonymousResourceCollection
    {
        $this->authorize('view', $account);

        return DealResource::collection(
            $account->deals()->with(['primaryContact', 'dealOwner'])->latest()->paginate(25)
        );
    }
}

import type { ApiAccount, ApiContact, ApiDeal } from "@/lib/api/crm/types";
import { dealDisplayName } from "@/lib/api/crm/deals";

const CLOSED_DEAL_STAGES = new Set(["lost", "project_created"]);

const WON_LINK_STAGES = new Set([
  "won",
  "accepted",
  "deposit_pending",
  "deposit_recorded",
]);

function dealTimestamp(deal: ApiDeal): number {
  const raw = deal.updated_at ?? deal.created_at;
  return raw ? new Date(raw).getTime() : 0;
}

export function isOpenDeal(deal: ApiDeal): boolean {
  return !CLOSED_DEAL_STAGES.has(String(deal.stage));
}

export function isWonLinkDeal(deal: ApiDeal): boolean {
  return WON_LINK_STAGES.has(String(deal.stage)) && !deal.project_id;
}

function sortDealsNewestFirst(deals: ApiDeal[]): ApiDeal[] {
  return [...deals].sort((a, b) => dealTimestamp(b) - dealTimestamp(a));
}

/** Best deal when opening the form from an account (URL or full prefill). */
export function pickBestDealForAccount(deals: ApiDeal[]): ApiDeal | null {
  const open = deals.filter(isOpenDeal);
  if (!open.length) return null;

  const won = sortDealsNewestFirst(open.filter(isWonLinkDeal));
  if (won.length) return won[0];

  return sortDealsNewestFirst(open)[0] ?? null;
}

/** Deal auto-select when the user changes account in the form. */
export function pickDealOnAccountChange(deals: ApiDeal[]): ApiDeal | null {
  const open = deals.filter(isOpenDeal);
  if (!open.length) return null;

  const won = sortDealsNewestFirst(open.filter(isWonLinkDeal));
  if (won.length) return won[0];

  if (open.length === 1) return open[0];

  return null;
}

export function findEmbeddedContact(
  account: ApiAccount,
  deal: ApiDeal | null | undefined,
  contactId: number,
): ApiContact | null {
  const id = Number(contactId);
  if (!Number.isFinite(id)) return null;

  const fromDeal = deal?.contact;
  if (fromDeal && Number(fromDeal.id) === id) return fromDeal;

  return account.contacts?.find((c) => Number(c.id) === id) ?? null;
}

export function resolvePrimaryContactId(
  account: ApiAccount,
  deal?: ApiDeal | null,
): number | null {
  const raw =
    deal?.primary_contact_id ??
    deal?.contact_id ??
    account.primary_contact_id ??
    account.contacts?.[0]?.id;

  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function dealLinkLabel(deal: ApiDeal): string {
  return dealDisplayName(deal);
}

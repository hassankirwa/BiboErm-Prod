import { Badge } from "@/components/ui/badge";
import { initialsFromName, resolveMediaUrl } from "@/lib/media";
import type { ProfileChangeRequest, UserProfile } from "@/lib/api/hr";

export function EmployeePersonalPanel({
  profile,
  name,
  pendingChangeRequest,
}: {
  profile: UserProfile | null;
  name: string;
  pendingChangeRequest?: ProfileChangeRequest | null;
}) {
  if (!profile) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Personal profile not submitted yet.
      </div>
    );
  }

  const rows = [
    ["Phone", profile.phone],
    ["Gender", profile.gender],
    ["Address", profile.address],
    ["Emergency contact", profile.emergency_contact_name],
    ["Emergency phone", profile.emergency_contact_phone],
    ["Relationship", profile.emergency_contact_relationship],
  ];

  const avatarSrc = resolveMediaUrl(profile.avatar_url);
  const hasPendingRequest = pendingChangeRequest?.status === "pending";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex size-[200px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt={`${name} profile photo`}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-4xl font-semibold text-muted-foreground/70">
            {initialsFromName(name)}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Personal information</h3>
        {hasPendingRequest && (
          <Badge variant="secondary" className="border-amber-300 bg-amber-100 text-amber-900">
            Profile change request
          </Badge>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Submitted by the employee during onboarding. Read-only for HR.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

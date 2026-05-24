"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Phone, Save } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  GENDER_OPTIONS,
  submitProfileChangeRequest,
  updateProfile,
  uploadAvatar,
  type Gender,
  type ProfileChangeRequest,
  type ProfileSettings,
} from "@/lib/api/profile";
import { initialsFromName, resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type ProfileSettingsPanelProps = {
  initial: ProfileSettings;
  onSaved: (next: ProfileSettings) => void;
  onAvatarUpdated?: () => void;
};

export function ProfileSettingsPanel({ initial, onSaved, onAvatarUpdated }: ProfileSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.user.name);
  const [email, setEmail] = useState(initial.user.email);
  const [phone, setPhone] = useState(initial.profile.phone ?? "");
  const [gender, setGender] = useState<Gender | "">(initial.profile.gender ?? "");
  const [address, setAddress] = useState(initial.profile.address ?? "");
  const [emergencyName, setEmergencyName] = useState(
    initial.profile.emergency_contact_name ?? ""
  );
  const [emergencyRelation, setEmergencyRelation] = useState(
    initial.profile.emergency_contact_relationship ?? ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initial.profile.emergency_contact_phone ?? ""
  );
  const [avatarUrl, setAvatarUrl] = useState(initial.profile.avatar_url);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ProfileChangeRequest | null>(
    initial.pending_change_request ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isActiveAccount =
    !initial.user.status || initial.user.status === "active";
  const hasPendingRequest = pendingRequest?.status === "pending";
  const formLocked = hasPendingRequest;

  useEffect(() => {
    setName(initial.user.name);
    setEmail(initial.user.email);
    setAvatarUrl(initial.profile.avatar_url);
    setPendingRequest(initial.pending_change_request ?? null);
  }, [
    initial.user.name,
    initial.user.email,
    initial.profile.avatar_url,
    initial.pending_change_request,
  ]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.avatar_url ?? result.profile.avatar_url);
      setSuccess("Profile photo updated.");
      onSaved({
        ...initial,
        profile: result.profile,
      });
      onAvatarUpdated?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to upload photo."
          : "Unable to upload photo."
      );
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone || undefined,
      gender: gender || undefined,
      address: address || undefined,
      emergency_contact_name: emergencyName || undefined,
      emergency_contact_phone: emergencyPhone || undefined,
      emergency_contact_relationship: emergencyRelation || undefined,
    };

    try {
      if (isActiveAccount) {
        const result = await submitProfileChangeRequest({
          ...payload,
          user_note: userNote || undefined,
        });
        setPendingRequest(result.change_request);
        setSuccess("Profile change request submitted for HR review.");
        setUserNote("");
        onSaved({
          ...initial,
          pending_change_request: result.change_request,
        });
      } else {
        const result = await updateProfile(payload);
        setSuccess("Profile saved.");
        onSaved({
          ...initial,
          profile: result.profile,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to save profile."
          : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      )}

      {hasPendingRequest && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your profile change request is awaiting HR review. You can submit a new request after
          it is approved or rejected.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Account</CardTitle>
            {hasPendingRequest && (
              <Badge variant="secondary" className="border-amber-300 bg-amber-100 text-amber-900">
                Change pending
              </Badge>
            )}
          </div>
          <CardDescription>
            {isActiveAccount
              ? "Enter updated name or email below — included when you request changes."
              : "Managed by HR — contact them to change name or email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Full name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isActiveAccount || formLocked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isActiveAccount || formLocked}
            />
          </div>
          {initial.employee_number && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="settings-employee-number">Employee number</Label>
              <Input
                id="settings-employee-number"
                value={initial.employee_number}
                disabled
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
          <CardDescription>JPG, PNG or WebP · max 2 MB</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:items-center">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              className="relative w-fit shrink-0 disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
            >
              <UserAvatar
                name={initial.user.name}
                src={avatarUrl}
                className="size-16"
                fallbackClassName="text-base"
              />
              {avatarUploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="size-5 animate-spin" />
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUploading ? "Uploading…" : "Change photo"}
            </Button>
          </div>

          <div
            className={cn(
              "flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl border bg-muted/30 md:ml-auto",
              avatarUploading && "opacity-70"
            )}
          >
            {resolveMediaUrl(avatarUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(avatarUrl)!}
                alt={`${initial.user.name} profile photo`}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-5xl font-semibold text-muted-foreground/70">
                {initialsFromName(initial.user.name)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Personal details</CardTitle>
            {hasPendingRequest && (
              <Badge variant="secondary" className="border-amber-300 bg-amber-100 text-amber-900">
                Profile change request pending
              </Badge>
            )}
          </div>
          <CardDescription>
            {isActiveAccount
              ? "Update any fields below, then submit one request for HR approval. Profile photo updates apply immediately."
              : "Keep your contact and emergency information up to date."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <div className="relative">
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pr-10"
                  disabled={formLocked}
                />
                <Phone className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={gender || undefined}
                onValueChange={(v) => setGender(v as Gender)}
                disabled={formLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-address">Home address</Label>
            <Input
              id="settings-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, postal code"
              disabled={formLocked}
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency contact
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-emergency-name">Full name</Label>
              <Input
                id="settings-emergency-name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                disabled={formLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-emergency-relation">Relationship</Label>
              <Input
                id="settings-emergency-relation"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                disabled={formLocked}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-emergency-phone">Phone</Label>
            <div className="relative">
              <Input
                id="settings-emergency-phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="pr-10"
                disabled={formLocked}
              />
              <Phone className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {isActiveAccount && !formLocked && (
            <div className="space-y-2">
              <Label htmlFor="settings-user-note">Note for HR (optional)</Label>
              <Textarea
                id="settings-user-note"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Explain why you need these changes…"
                rows={2}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button type="submit" disabled={saving || avatarUploading || formLocked}>
            <Save className="size-4" />
            {saving
              ? isActiveAccount
                ? "Submitting…"
                : "Saving…"
              : isActiveAccount
                ? "Request changes"
                : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

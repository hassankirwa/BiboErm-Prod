"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Phone } from "lucide-react";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { OnboardingStepper } from "@/components/auth/onboarding-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import * as profileApi from "@/lib/api/profile";
import { GENDER_OPTIONS, type Gender } from "@/lib/api/profile";

const profileSteps = [
  { id: 1, label: "Accept Invite", status: "done" as const },
  { id: 2, label: "Your Profile", status: "active" as const },
  { id: 3, label: "HR Review", status: "pending" as const },
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (avatarFile) {
        await profileApi.uploadAvatar(avatarFile);
      }

      await profileApi.updateProfile({
        phone,
        gender: gender || undefined,
        address: address || undefined,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_relationship: emergencyRelation || undefined,
      });

      const payload = await refreshMe();
      router.push(payload?.redirect ?? "/onboarding/pending-hr");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.firstError() ?? "Unable to save profile.");
      } else {
        setError("Unable to save profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout extraWide centered={false}>
      <OnboardingStepper steps={profileSteps} />

      <div>
        <h1 className="auth-card-title text-left text-[1.375rem]">
          Tell us about you{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="auth-card-sub text-left">
          Step 2 of 3 · Personal information
        </p>
      </div>

      {error && <AuthBanner variant="error" title={error} />}

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="auth-avatar-upload overflow-hidden"
          aria-label="Add passport-style profile photo"
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Profile preview"
              className="size-full object-cover"
            />
          ) : (
            <Camera className="size-6" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div>
          <p className="text-sm font-semibold">Add a passport-style photo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Passport size (35×45 mm) · head and shoulders · plain light background ·
            face clearly visible · recent photo
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG or WebP · max 2 MB · optional
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number *</Label>
            <div className="relative">
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="pr-10"
              />
              <Phone className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender (optional)</Label>
            <Select
              value={gender || undefined}
              onValueChange={setGender}
            >
              <SelectTrigger id="gender" className="w-full">
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
          <Label htmlFor="address">Home address (optional)</Label>
          <Input
            id="address"
            placeholder="Street, city, postal code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <p className="auth-section-label">Emergency contact</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency-name">Full name *</Label>
            <Input
              id="emergency-name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency-relation">Relationship</Label>
            <Input
              id="emergency-relation"
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergency-phone">Phone *</Label>
          <div className="relative">
            <Input
              id="emergency-phone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              required
              className="pr-10"
            />
            <Phone className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & continue"}
            {!isLoading && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </form>
    </AuthCardLayout>
  );
}

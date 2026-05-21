"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, ChevronDown, Phone } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { OnboardingStepper } from "@/components/auth/onboarding-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSteps = [
  { id: 1, label: "Accept Invite", status: "done" as const },
  { id: 2, label: "Your Profile", status: "active" as const },
  { id: 3, label: "HR Review", status: "pending" as const },
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("+254 712 345 678");
  const [emergencyName, setEmergencyName] = useState("Mary Mwangi");
  const [emergencyRelation, setEmergencyRelation] = useState("Sister");
  const [emergencyPhone, setEmergencyPhone] = useState("+254 723 998 211");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    router.push("/onboarding/pending-hr");
  };

  return (
    <AuthCardLayout wide centered={false}>
      <OnboardingStepper steps={profileSteps} />

      <div>
        <h1 className="auth-card-title text-left text-[1.375rem]">
          Tell us about you
        </h1>
        <p className="auth-card-sub text-left">
          Step 2 of 3 · Personal information
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="auth-avatar-upload"
          aria-label="Add profile photo"
        >
          <Camera className="size-6" />
        </button>
        <div>
          <p className="text-sm font-semibold">Add a profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPG or PNG · max 5 MB · optional
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-2">
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
            <div className="relative">
              <Input
                id="gender"
                placeholder="Select…"
                className="pr-10"
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Home address (optional)</Label>
          <Input id="address" placeholder="Street, city, postal code" />
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

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost">
            Save draft
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & continue"}
            {!isLoading && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </form>
    </AuthCardLayout>
  );
}

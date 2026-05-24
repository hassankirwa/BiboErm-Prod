"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ChangePasswordPanel } from "@/components/settings/change-password-panel";
import { ProfileSettingsPanel } from "@/components/settings/profile-settings-panel";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { fetchProfile, type ProfileSettings } from "@/lib/api/profile";

export default function WorkspaceSettingsPage() {
  const { refreshMe } = useAuth();
  const [data, setData] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchProfile());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load settings."
          : "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-destructive">{error ?? "Unable to load settings."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl bg-background px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, password, and security preferences.
          </p>
        </div>

        <Tabs defaultValue="profile" className="gap-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <ProfileSettingsPanel
              initial={data}
              onSaved={(next) => {
                setData(next);
                void loadProfile();
              }}
              onAvatarUpdated={() => void refreshMe()}
            />
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-6">
            <ChangePasswordPanel />
            <TwoFactorPanel
              enabled={data.user.two_factor_enabled}
              onChanged={(enabled) => {
                setData({
                  ...data,
                  user: { ...data.user, two_factor_enabled: enabled },
                });
                void refreshMe();
              }}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestClientPortalAccess } from "@/lib/api/client-portal";

export default function ClientPortalAccessPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await requestClientPortalAccess({ identifier, phone });
      window.localStorage.setItem("bibo_client_portal_token", response.data.access_token);
      window.localStorage.setItem("bibo_client_portal_project_id", String(response.data.project.id));
      router.push(`/client-portal/progress?project=${response.data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the project portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#ec2024]">
            Bibo client portal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Track your project
          </h1>
          <p className="mt-3 text-sm text-[#737373]">
            Enter your project number or client code and the phone number on file to view progress,
            site photos, and documents.
          </p>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-[#fff5f5] p-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-black">
              Project number or client code
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="PR-XXXXXXXX or CP-XXXXXXXX"
              required
              className="border-[#e5e5e5] bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-black">
              Phone number
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="07..."
              required
              className="border-[#e5e5e5] bg-white"
            />
          </div>
          {error ? <p className="text-sm text-[#ec2024]">{error}</p> : null}
          <Button className="w-full bg-[#ec2024] hover:bg-[#d41c20]" type="submit" disabled={loading}>
            {loading ? "Checking..." : "View progress"}
          </Button>
        </form>
      </div>
    </main>
  );
}

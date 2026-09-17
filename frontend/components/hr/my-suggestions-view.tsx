"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { submitMySuggestion } from "@/lib/api/hr";

export function MySuggestionsView() {
  const { user } = useAuth();
  const isSharedAccount =
    Boolean(user?.is_shared_account) ||
    /shared/i.test(user?.email ?? "");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (anonymous) {
      setEmployeeNumber("");
    }
  }, [anonymous]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await submitMySuggestion({
        body,
        is_anonymous: anonymous,
        employee_number:
          isSharedAccount && !anonymous
            ? employeeNumber.trim() || undefined
            : undefined,
      });
      setBody("");
      setAnonymous(false);
      setEmployeeNumber("");
      setSuccess(
        anonymous
          ? "Anonymous suggestion submitted. Your name will not be shared with HR."
          : "Suggestion submitted."
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to submit suggestion."
          : "Unable to submit suggestion."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Suggestion box</h1>
        <p className="text-sm text-muted-foreground">
          Share feedback with HR. Optionally submit anonymously.
          {isSharedAccount
            ? " Shared accounts must include your employee number unless the suggestion is anonymous."
            : null}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSharedAccount && !anonymous ? (
              <div className="space-y-2">
                <Label htmlFor="suggestion-employee-number">
                  Employee number *
                </Label>
                <Input
                  id="suggestion-employee-number"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="e.g. BWD1073"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="suggestion-body">Your suggestion</Label>
              <Textarea
                id="suggestion-body"
                required
                minLength={3}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="anonymous"
                checked={anonymous}
                onCheckedChange={setAnonymous}
              />
              <Label htmlFor="anonymous">Submit anonymously</Label>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

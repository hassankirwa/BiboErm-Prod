"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";
import type { ProfileChangeRequest } from "@/lib/api/hr";
import {
  PROFILE_FIELD_LABELS,
  formatProfileFieldValue,
} from "@/lib/profile-fields";

type ProfileChangeRequestReviewProps = {
  request: ProfileChangeRequest;
  disabled?: boolean;
  onReviewed: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function ProfileChangeRequestReview({
  request,
  disabled,
  onReviewed,
  onError,
  onSuccess,
}: ProfileChangeRequestReviewProps) {
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await hrApi.approveProfileChangeRequest(request.id);
      onSuccess("Profile changes approved.");
      onReviewed();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to approve request."
          : "Failed to approve request."
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await hrApi.rejectProfileChangeRequest(request.id, reason || undefined);
      onSuccess("Profile change request rejected.");
      onReviewed();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to reject request."
          : "Failed to reject request."
      );
    } finally {
      setRejecting(false);
    }
  };

  const changes = Object.entries(request.requested_changes ?? {});

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Profile change request</h3>
        <Badge variant="secondary" className="border-amber-300 bg-amber-100 text-amber-900">
          Pending review
        </Badge>
      </div>

      {request.user_note && (
        <p className="mb-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Employee note:</span>{" "}
          {request.user_note}
        </p>
      )}

      <dl className="mb-4 space-y-3">
        {changes.map(([field, newValue]) => (
          <div key={field} className="rounded-md border bg-background px-3 py-2">
            <dt className="text-xs font-medium text-muted-foreground">
              {PROFILE_FIELD_LABELS[field] ?? field}
            </dt>
            <dd className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Current: </span>
                {formatProfileFieldValue(request.previous_values?.[field])}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Requested: </span>
                <span className="font-medium">{formatProfileFieldValue(newValue)}</span>
              </div>
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Rejection reason (optional)</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the request was rejected…"
            rows={2}
            disabled={disabled || approving || rejecting}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || approving || rejecting}
            onClick={() => void handleReject()}
          >
            <X className="size-4" />
            {rejecting ? "Rejecting…" : "Reject"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled || approving || rejecting}
            onClick={() => void handleApprove()}
          >
            <Check className="size-4" />
            {approving ? "Approving…" : "Approve changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

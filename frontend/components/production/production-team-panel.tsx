"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  assignProductionTeam,
  type ProductionOrderTeam,
  type ProductionStageValue,
} from "@/lib/api/production";
import { fetchUsers, type ApiUserDetail } from "@/lib/api/users";
import { PRODUCTION_STAGE_OPTIONS, TEAM_ROLE_OPTIONS } from "@/lib/production/utils";
import { toast } from "sonner";

type Props = {
  orderId: number;
  currentStage: ProductionStageValue;
  teams?: ProductionOrderTeam[];
  canAssign: boolean;
  onUpdated: () => void;
};

export function ProductionTeamPanel({
  orderId,
  currentStage,
  teams = [],
  canAssign,
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ApiUserDetail[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>(TEAM_ROLE_OPTIONS[0].value);
  const [stage, setStage] = useState<ProductionStageValue>(currentStage);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function openAssign() {
    setOpen(true);
    setStage(currentStage);
    try {
      const res = await fetchUsers({ status: "active" });
      setUsers(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load users"));
    }
  }

  async function handleAssign() {
    if (!userId) {
      toast.error("Select a team member");
      return;
    }
    setLoading(true);
    try {
      await assignProductionTeam(orderId, {
        user_id: Number(userId),
        stage,
        role,
        notes: notes || undefined,
      });
      toast.success("Team member assigned");
      setOpen(false);
      setUserId("");
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to assign team member"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Team assignments</h4>
        {canAssign && (
          <Button size="sm" variant="outline" onClick={openAssign}>
            Assign member
          </Button>
        )}
      </div>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {teams.map((team) => (
            <li key={team.id} className="flex justify-between border-b border-border pb-2">
              <span>
                {team.user?.name ?? `User #${team.user_id}`} ·{" "}
                {TEAM_ROLE_OPTIONS.find((r) => r.value === team.role)?.label ??
                  team.role.replace(/_/g, " ")}
              </span>
              <span className="text-muted-foreground">
                {PRODUCTION_STAGE_OPTIONS.find((s) => s.value === team.stage)?.label ??
                  team.stage.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign production team</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as ProductionStageValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssign} disabled={loading}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

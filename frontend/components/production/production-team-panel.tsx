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
  assignProductionTeam,
  listProductionTeams,
  type ProductionOrderTeam,
  type ProductionStageValue,
} from "@/lib/api/production";
import { fetchUsers, type ApiUserDetail } from "@/lib/api/users";
import { toast } from "sonner";

const TEAM_ROLES = [
  { value: "cutting_lead", label: "Cutting lead" },
  { value: "fabrication_lead", label: "Fabrication lead" },
  { value: "assembly_lead", label: "Assembly lead" },
  { value: "qc_liaison", label: "QC liaison" },
] as const;

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
  const [role, setRole] = useState("cutting_lead");
  const [stage, setStage] = useState<ProductionStageValue>(currentStage);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function openAssign() {
    setOpen(true);
    setStage(currentStage);
    try {
      const res = await fetchUsers({ status: "active" });
      setUsers(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    }
  }

  async function handleAssign() {
    const selectedUserId = Number(userId);
    if (!selectedUserId) {
      toast.error("Select a team member");
      return;
    }
    setLoading(true);
    try {
      await assignProductionTeam(orderId, {
        user_id: selectedUserId,
        stage,
        role,
        notes: notes || undefined,
      });
      await listProductionTeams(orderId);
      toast.success("Team member assigned");
      setOpen(false);
      setUserId("");
      setNotes("");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign team member");
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
                {team.user?.name ?? `User #${team.user_id}`} · {team.role.replace(/_/g, " ")}
              </span>
              <span className="text-muted-foreground">{team.stage.replace(/_/g, " ")}</span>
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
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">Select user…</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={stage}
                onChange={(e) => setStage(e.target.value as ProductionStageValue)}
              >
                <option value="material_prep">Material prep</option>
                <option value="qc_pre_check">QC pre-check</option>
                <option value="cutting">Cutting</option>
                <option value="fabrication">Fabrication</option>
                <option value="sash">Sash</option>
                <option value="glass_assembly">Glass assembly</option>
                <option value="finishing">Finishing</option>
                <option value="qc_post_fabrication">QC post-fabrication</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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

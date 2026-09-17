"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import {
  createDeductionType,
  deleteDeductionType,
  fetchPayrollSettings,
  updateDeductionType,
  updatePayrollSettings,
  type PayrollDeductionType,
  type PayrollSettings,
} from "@/lib/api/hr";
import { DepartmentSharedEmailsPanel } from "@/components/hr/department-shared-emails-panel";

function pct(rate: number | null) {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

export function PayrollSettingsPanel() {
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [deductions, setDeductions] = useState<PayrollDeductionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newMethod, setNewMethod] = useState<"percent_of_gross" | "fixed">(
    "percent_of_gross"
  );
  const [newRate, setNewRate] = useState("1.5");
  const [newAmount, setNewAmount] = useState("");
  const [newTaxDeductible, setNewTaxDeductible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayrollSettings();
      setSettings(result.data.settings);
      setDeductions(result.data.deduction_types);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load payroll settings."
          : "Unable to load payroll settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updatePayrollSettings({
        nssf_tier1_cap: settings.nssf_tier1_cap,
        nssf_tier2_cap: settings.nssf_tier2_cap,
        nssf_rate: settings.nssf_rate,
        personal_relief: settings.personal_relief,
        annual_leave_days: settings.annual_leave_days,
        paye_bands: settings.paye_bands,
      });
      setSettings(result.data.settings);
      setDeductions(result.data.deduction_types);
      setSuccess("Payroll settings saved.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to save settings."
          : "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDeduction = async (item: PayrollDeductionType, enabled: boolean) => {
    setError(null);
    try {
      const result = await updateDeductionType(item.id, { enabled });
      setDeductions((prev) =>
        prev.map((row) => (row.id === item.id ? result.data : row))
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to update deduction."
          : "Unable to update deduction."
      );
    }
  };

  const addCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createDeductionType({
        name: newName,
        method: newMethod,
        rate:
          newMethod === "percent_of_gross"
            ? Number(newRate) / 100
            : undefined,
        amount: newMethod === "fixed" ? Number(newAmount) : undefined,
        tax_deductible: newTaxDeductible,
        enabled: true,
      });
      setNewName("");
      setNewRate("1.5");
      setNewAmount("");
      setNewTaxDeductible(false);
      await load();
      setSuccess("Custom deduction added.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to add deduction."
          : "Unable to add deduction."
      );
    }
  };

  const removeCustom = async (id: number) => {
    setError(null);
    try {
      await deleteDeductionType(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to delete deduction."
          : "Unable to delete deduction."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading payroll settings…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-sm text-destructive">
        {error ?? "Payroll settings unavailable."}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure SHIF, NSSF, PAYE, and company deductions. NHIF is not used.
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
          <CardTitle className="text-base">NSSF &amp; PAYE parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>NSSF tier 1 cap</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.nssf_tier1_cap}
                onChange={(e) =>
                  setSettings({ ...settings, nssf_tier1_cap: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>NSSF tier 2 cap</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.nssf_tier2_cap}
                onChange={(e) =>
                  setSettings({ ...settings, nssf_tier2_cap: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>NSSF rate (e.g. 0.06)</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step="0.001"
                value={settings.nssf_rate}
                onChange={(e) =>
                  setSettings({ ...settings, nssf_rate: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Personal relief</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.personal_relief}
                onChange={(e) =>
                  setSettings({ ...settings, personal_relief: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Annual leave days (per year)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                step="1"
                value={settings.annual_leave_days ?? 21}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    annual_leave_days: Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Company entitlement for annual leave. Remaining days are reduced when HR
                approves annual leave requests.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save parameters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deduction catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Rate / amount</TableHead>
                <TableHead>Tax deductible</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="capitalize">
                    {item.method.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell>
                    {item.method === "fixed"
                      ? item.amount?.toLocaleString()
                      : pct(item.rate)}
                  </TableCell>
                  <TableCell>{item.tax_deductible ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(enabled) => void toggleDeduction(item, enabled)}
                    />
                  </TableCell>
                  <TableCell>
                    {!item.is_system && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeCustom(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <form onSubmit={addCustom} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Custom deduction name</Label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Staff welfare"
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={newMethod}
                onValueChange={(v) => setNewMethod(v as "percent_of_gross" | "fixed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent_of_gross">Percent of gross</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newMethod === "percent_of_gross" ? (
              <div className="space-y-2">
                <Label>Percent</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={newTaxDeductible}
                onCheckedChange={setNewTaxDeductible}
                id="tax-deductible"
              />
              <Label htmlFor="tax-deductible">Tax deductible (reduces PAYE base)</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">
                <Plus className="size-4" />
                Add custom deduction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DepartmentSharedEmailsPanel />
    </div>
  );
}

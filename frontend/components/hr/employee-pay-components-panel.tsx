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
  createPayComponent,
  deletePayComponent,
  fetchPayComponents,
  type EmployeePayComponent,
  type PayComponentKind,
} from "@/lib/api/hr";

const ADDITION_CATEGORIES = [
  { value: "bonus", label: "Bonus" },
  { value: "overtime", label: "Overtime" },
  { value: "house_allowance", label: "House allowance" },
  { value: "transport_allowance", label: "Transport allowance" },
  { value: "other_allowance", label: "Other allowance" },
  { value: "custom", label: "Custom" },
];

const DEDUCTION_CATEGORIES = [
  { value: "damage", label: "Damage" },
  { value: "lost_tool", label: "Lost tool" },
  { value: "salary_advance", label: "Salary advance" },
  { value: "custom", label: "Custom" },
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function PayComponentSection({
  title,
  kind,
  items,
  disabled,
  onChanged,
  userId,
  defaultFrom = "",
  defaultTo = "",
  defaultRecurring = true,
}: {
  title: string;
  kind: PayComponentKind;
  items: EmployeePayComponent[];
  disabled?: boolean;
  onChanged: () => void;
  userId: number;
  defaultFrom?: string;
  defaultTo?: string;
  defaultRecurring?: boolean;
}) {
  const categories = kind === "addition" ? ADDITION_CATEGORIES : DEDUCTION_CATEGORIES;
  const [category, setCategory] = useState(categories[0].value);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(defaultRecurring);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecurring(defaultRecurring);
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, [defaultRecurring, defaultFrom, defaultTo]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPayComponent(userId, {
        kind,
        category,
        label: label || undefined,
        amount: Number(amount),
        is_recurring: recurring,
        effective_from: from || null,
        effective_to: to || null,
      });
      setLabel("");
      setAmount("");
      setFrom(defaultFrom);
      setTo(defaultTo);
      setRecurring(defaultRecurring);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to save pay component."
          : "Unable to save pay component."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await deletePayComponent(userId, id);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to delete."
          : "Unable to delete."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="capitalize">
                    {item.category.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell>{item.label || "—"}</TableCell>
                  <TableCell>{formatMoney(item.amount)}</TableCell>
                  <TableCell>{item.is_recurring ? "Yes" : "One-off"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[item.effective_from, item.effective_to].filter(Boolean).join(" → ") ||
                      "Any"}
                  </TableCell>
                  <TableCell>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(item.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!disabled && (
          <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={recurring} onCheckedChange={setRecurring} id={`${kind}-recurring`} />
              <Label htmlFor={`${kind}-recurring`}>Recurring each payroll</Label>
            </div>
            <div className="space-y-2">
              <Label>Effective from</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Effective to</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add {kind === "addition" ? "earning" : "deduction"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeePayComponentsPanel({
  userId,
  disabled = false,
  periodYear,
  periodMonth,
  onChanged,
}: {
  userId: number;
  disabled?: boolean;
  periodYear?: number;
  periodMonth?: number;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<EmployeePayComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodBounds = (() => {
    if (!periodYear || !periodMonth) {
      return { from: "", to: "", oneOffDefault: false };
    }
    const lastDay = new Date(periodYear, periodMonth, 0).getDate();
    const mm = String(periodMonth).padStart(2, "0");
    return {
      from: `${periodYear}-${mm}-01`,
      to: `${periodYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
      oneOffDefault: true,
    };
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayComponents(userId);
      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load pay components."
          : "Unable to load pay components."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChanged = () => {
    void load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading earnings and deductions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PayComponentSection
        title="Earnings / additions"
        kind="addition"
        items={items.filter((item) => item.kind === "addition")}
        disabled={disabled}
        onChanged={handleChanged}
        userId={userId}
        defaultFrom={periodBounds.from}
        defaultTo={periodBounds.to}
        defaultRecurring={!periodBounds.oneOffDefault}
      />
      <PayComponentSection
        title="Extra deductions"
        kind="deduction"
        items={items.filter((item) => item.kind === "deduction")}
        disabled={disabled}
        onChanged={handleChanged}
        userId={userId}
        defaultFrom={periodBounds.from}
        defaultTo={periodBounds.to}
        defaultRecurring={!periodBounds.oneOffDefault}
      />
    </div>
  );
}

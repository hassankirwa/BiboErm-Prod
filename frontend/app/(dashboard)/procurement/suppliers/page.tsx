"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SuppliersTable } from "@/components/procurement/suppliers-table";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupplier,
  fetchSuggestedSupplierCode,
  type SupplierCategoryOption,
} from "@/lib/api/procurement";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SupplierCategoryOption[]>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    email: "",
    phone: "",
    address: "",
    is_preferred: false,
  });

  const resetForm = () =>
    setForm({
      code: "",
      name: "",
      category: "",
      email: "",
      phone: "",
      address: "",
      is_preferred: false,
    });

  const loadCategoryOptions = useCallback(async () => {
    try {
      const result = await fetchSuggestedSupplierCode();
      setCategoryOptions(result.categories ?? []);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.firstError() ?? "Unable to load supplier categories."
          : "Unable to load supplier categories."
      );
    }
  }, []);

  const loadSuggestedCode = useCallback(async (category: string) => {
    if (!category) {
      setForm((current) => ({ ...current, code: "" }));
      return;
    }

    setGeneratingCode(true);
    try {
      const result = await fetchSuggestedSupplierCode(category);
      setCategoryOptions(result.categories ?? []);
      setForm((current) => ({ ...current, code: result.code ?? "" }));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.firstError() ?? "Unable to generate supplier code."
          : "Unable to generate supplier code."
      );
    } finally {
      setGeneratingCode(false);
    }
  }, []);

  const handleCreateSupplier = async () => {
    setSubmitting(true);
    try {
      await createSupplier({
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        is_preferred: form.is_preferred,
      });
      toast.success("Supplier created.");
      setRefreshKey((value) => value + 1);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const canGenerateCode = Boolean(form.category);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Suppliers"
        subtitle="Manage your supplier directory"
        actions={
          <PermissionGate anyOf={["procurement.supplier.manage", "procurement.manage"]}>
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                  void loadCategoryOptions();
                } else {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Supplier</DialogTitle>
                  <DialogDescription>
                    Select a category first to generate a supplier code such as SUP-ALU-02.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="supplier-name">Supplier name</Label>
                    <Input
                      id="supplier-name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-category">Category</Label>
                      <Select
                        value={form.category || "_unset"}
                        onValueChange={(value) => {
                          const category = value === "_unset" ? "" : value;
                          setForm((current) => ({ ...current, category }));
                          void loadSuggestedCode(category);
                        }}
                      >
                        <SelectTrigger id="supplier-category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_unset">Select category</SelectItem>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-phone">Phone</Label>
                      <Input
                        id="supplier-phone"
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier-code">Supplier code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="supplier-code"
                        value={form.code}
                        placeholder={canGenerateCode ? "Generating..." : "Select a category first"}
                        onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                        disabled={generatingCode}
                        className="min-w-0 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={generatingCode || !canGenerateCode}
                        onClick={() => void loadSuggestedCode(form.category)}
                        title={canGenerateCode ? "Regenerate supplier code" : "Select a category first"}
                        aria-label={canGenerateCode ? "Regenerate supplier code" : "Select a category first"}
                      >
                        <Sparkles className={`h-4 w-4 ${generatingCode ? "animate-pulse" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-email">Email</Label>
                      <Input
                        id="supplier-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-address">Address</Label>
                      <Textarea
                        id="supplier-address"
                        value={form.address}
                        onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                      />
                    </div>
                  </div>
                  <Label htmlFor="supplier-preferred">
                    <Checkbox
                      id="supplier-preferred"
                      checked={form.is_preferred}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({ ...current, is_preferred: checked === true }))
                      }
                    />
                    Preferred supplier
                  </Label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={submitting || !form.name.trim() || (!form.code.trim() && !form.category)}
                    onClick={handleCreateSupplier}
                  >
                    {submitting ? "Creating..." : "Create supplier"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </PermissionGate>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search suppliers..."
              className="pl-8 h-9"
            />
          </div>
          <SuppliersTable refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}

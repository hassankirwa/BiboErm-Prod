"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRACT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  fetchSuggestedEmployeeNumber,
  type ContractType,
  type EmploymentType,
  type HrEmployeeListItem,
} from "@/lib/api/hr";
import { ApiError } from "@/lib/api/client";

export type HrFormState = {
  employee_number: string;
  job_title: string;
  unit: string;
  employment_type: EmploymentType;
  start_date: string;
  reporting_manager_id: string;
  work_location: string;
  department_email: string;
  national_id: string;
  kra_pin: string;
  nssf_number: string;
  shif_number: string;
  bank_or_mpesa: string;
  salary_grade: string;
  monthly_gross_salary: string;
  contract_type: ContractType | "";
  contract_end_date: string;
  hr_notes: string;
};

export const emptyHrForm = (): HrFormState => ({
  employee_number: "",
  job_title: "",
  unit: "",
  employment_type: "full_time",
  start_date: new Date().toISOString().slice(0, 10),
  reporting_manager_id: "",
  work_location: "",
  department_email: "",
  national_id: "",
  kra_pin: "",
  nssf_number: "",
  shif_number: "",
  bank_or_mpesa: "",
  salary_grade: "",
  monthly_gross_salary: "",
  contract_type: "",
  contract_end_date: "",
  hr_notes: "",
});

export function hrFormFromEmployee(
  employee: HrEmployeeListItem["employee_profile"] | null | undefined
): HrFormState {
  return {
    employee_number: employee?.employee_number ?? "",
    job_title: employee?.job_title ?? "",
    unit: employee?.unit ?? "",
    employment_type: employee?.employment_type ?? "full_time",
    start_date: employee?.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    reporting_manager_id: employee?.reporting_manager_id
      ? String(employee.reporting_manager_id)
      : "",
    work_location: employee?.work_location ?? "",
    department_email: employee?.department_email ?? "",
    national_id: employee?.national_id ?? "",
    kra_pin: employee?.kra_pin ?? "",
    nssf_number: employee?.nssf_number ?? "",
    shif_number: employee?.shif_number ?? "",
    bank_or_mpesa: employee?.bank_or_mpesa ?? "",
    salary_grade: employee?.salary_grade ?? "",
    monthly_gross_salary:
      employee?.monthly_gross_salary != null
        ? String(employee.monthly_gross_salary)
        : "",
    contract_type: employee?.contract_type ?? "",
    contract_end_date: employee?.contract_end_date?.slice(0, 10) ?? "",
    hr_notes: employee?.hr_notes ?? "",
  };
}

type EmployeeHrFormProps = {
  form: HrFormState;
  onChange: (form: HrFormState) => void;
  managers: HrEmployeeListItem[];
  excludeUserId?: number;
  disabled?: boolean;
  onGenerateError?: (message: string) => void;
};

export function EmployeeHrForm({
  form,
  onChange,
  managers,
  excludeUserId,
  disabled = false,
  onGenerateError,
}: EmployeeHrFormProps) {
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const set = (patch: Partial<HrFormState>) => onChange({ ...form, ...patch });

  const handleGenerateEmployeeNumber = async () => {
    setGeneratingNumber(true);
    try {
      const result = await fetchSuggestedEmployeeNumber(excludeUserId);
      set({ employee_number: result.employee_number });
    } catch (err) {
      onGenerateError?.(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to generate employee number."
          : "Unable to generate employee number."
      );
    } finally {
      setGeneratingNumber(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee-number">Employee number *</Label>
          <div className="flex gap-2">
            <Input
              id="employee-number"
              value={form.employee_number}
              onChange={(e) => set({ employee_number: e.target.value })}
              disabled={disabled}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || generatingNumber}
              onClick={() => void handleGenerateEmployeeNumber()}
              title="Generate next employee number"
              aria-label="Generate next employee number"
            >
              <Sparkles className={`size-4 ${generatingNumber ? "animate-pulse" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-title">Job title *</Label>
          <Input
            id="job-title"
            value={form.job_title}
            onChange={(e) => set({ job_title: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={form.unit}
            onChange={(e) => set({ unit: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department-email">Department email (shared mailbox)</Label>
          <Input
            id="department-email"
            type="email"
            value={form.department_email}
            onChange={(e) => set({ department_email: e.target.value })}
            disabled={disabled}
            placeholder="e.g. warehouse@bibo.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Employment type *</Label>
          <Select
            value={form.employment_type}
            onValueChange={(v) => set({ employment_type: v as EmploymentType })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-date">Start date *</Label>
          <Input
            id="start-date"
            type="date"
            value={form.start_date}
            onChange={(e) => set({ start_date: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Reporting manager *</Label>
          <Select
            value={form.reporting_manager_id}
            onValueChange={(v) => set({ reporting_manager_id: v })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              {managers
                .filter((m) => m.id !== excludeUserId)
                .map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work-location">Work location</Label>
          <Input
            id="work-location"
            value={form.work_location}
            onChange={(e) => set({ work_location: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salary-grade">Salary grade</Label>
          <Input
            id="salary-grade"
            value={form.salary_grade}
            onChange={(e) => set({ salary_grade: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly-gross">Monthly gross salary (KES)</Label>
          <Input
            id="monthly-gross"
            type="number"
            min={0}
            step="0.01"
            value={form.monthly_gross_salary}
            onChange={(e) => set({ monthly_gross_salary: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Contract type</Label>
          <Select
            value={form.contract_type || undefined}
            onValueChange={(v) => set({ contract_type: v as ContractType })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select contract type" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contract-end-date">Contract end date</Label>
        <Input
          id="contract-end-date"
          type="date"
          value={form.contract_end_date}
          onChange={(e) => set({ contract_end_date: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="national-id">National ID</Label>
          <Input
            id="national-id"
            value={form.national_id}
            onChange={(e) => set({ national_id: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kra-pin">KRA PIN</Label>
          <Input
            id="kra-pin"
            value={form.kra_pin}
            onChange={(e) => set({ kra_pin: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nssf-number">NSSF No.</Label>
          <Input
            id="nssf-number"
            value={form.nssf_number}
            onChange={(e) => set({ nssf_number: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shif-number">SHIF (SHA) No.</Label>
          <Input
            id="shif-number"
            value={form.shif_number}
            onChange={(e) => set({ shif_number: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bank-or-mpesa">Bank / M-Pesa</Label>
          <Input
            id="bank-or-mpesa"
            value={form.bank_or_mpesa}
            onChange={(e) => set({ bank_or_mpesa: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hr-notes">HR notes (internal)</Label>
        <Textarea
          id="hr-notes"
          value={form.hr_notes}
          onChange={(e) => set({ hr_notes: e.target.value })}
          rows={3}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

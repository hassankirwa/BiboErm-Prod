"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  fetchLeads,
  leadDisplayName,
  type ApiLead,
} from "@/lib/api/crm/leads";

type LeadPickerProps = {
  value: number | null;
  displayLabel?: string | null;
  onSelect: (lead: ApiLead) => void;
  onClear: () => void;
  disabled?: boolean;
};

function leadSubtitle(lead: ApiLead): string | null {
  const company = lead.account_name?.trim() || lead.company?.trim();
  if (company && company !== leadDisplayName(lead)) return company;
  if (lead.phone?.trim()) return lead.phone.trim();
  if (lead.email?.trim()) return lead.email.trim();
  return lead.reference || null;
}

export function LeadPicker({
  value,
  displayLabel,
  onSelect,
  onClear,
  disabled,
}: LeadPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchLeads({ search: search.trim() || undefined, per_page: 30 })
        .then((res) => {
          if (!cancelled) setLeads(res.data);
        })
        .catch(() => {
          if (!cancelled) setLeads([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  const selectedLead = value ? leads.find((l) => l.id === value) : null;
  const buttonLabel =
    displayLabel ??
    (selectedLead ? leadDisplayName(selectedLead) : null) ??
    "Search leads…";

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 flex-1 justify-between font-normal"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, company, phone…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <>
                  <CommandEmpty>No leads found.</CommandEmpty>
                  <CommandGroup>
                    {leads.map((lead) => {
                      const subtitle = leadSubtitle(lead);
                      return (
                        <CommandItem
                          key={lead.id}
                          value={String(lead.id)}
                          onSelect={() => {
                            onSelect(lead);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === lead.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{leadDisplayName(lead)}</p>
                            {subtitle ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {subtitle}
                              </p>
                            ) : null}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={disabled}
          aria-label="Clear selected lead"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

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
import { fetchAccountDeals } from "@/lib/api/crm/accounts";
import {
  dealDisplayName,
  fetchDeals,
  type ApiDeal,
} from "@/lib/api/crm/deals";

type DealPickerProps = {
  value: number | null;
  displayLabel?: string | null;
  accountId?: number | null;
  onSelect: (deal: ApiDeal) => void;
  onClear: () => void;
  disabled?: boolean;
};

function dealSubtitle(deal: ApiDeal): string | null {
  if (deal.account?.name?.trim()) return deal.account.name.trim();
  if (deal.stage?.trim()) {
    return deal.stage
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return deal.reference || null;
}

export function DealPicker({
  value,
  displayLabel,
  accountId,
  onSelect,
  onClear,
  disabled,
}: DealPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const loadDeals = accountId
        ? fetchAccountDeals(accountId, { per_page: 50 }).then((res) => res.data)
        : fetchDeals({ per_page: 50 }).then((res) => res.data);

      loadDeals
        .then((data) => {
          if (cancelled) return;
          const term = search.trim().toLowerCase();
          const filtered = term
            ? data.filter((deal) => {
                const haystack = [
                  dealDisplayName(deal),
                  deal.account?.name,
                  deal.reference,
                  deal.stage,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();
                return haystack.includes(term);
              })
            : data;
          setDeals(filtered);
        })
        .catch(() => {
          if (!cancelled) setDeals([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, accountId]);

  const selectedDeal = value ? deals.find((deal) => deal.id === value) : null;
  const buttonLabel =
    displayLabel ??
    (selectedDeal ? dealDisplayName(selectedDeal) : null) ??
    "Search deals…";

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
              placeholder="Search by deal name, account, stage…"
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
                  <CommandEmpty>No deals found.</CommandEmpty>
                  <CommandGroup>
                    {deals.map((deal) => {
                      const subtitle = dealSubtitle(deal);
                      return (
                        <CommandItem
                          key={deal.id}
                          value={String(deal.id)}
                          onSelect={() => {
                            onSelect(deal);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === deal.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{dealDisplayName(deal)}</p>
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
          aria-label="Clear selected deal"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

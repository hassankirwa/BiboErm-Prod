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
import { fetchAccounts, type ApiAccount } from "@/lib/api/crm/accounts";

type AccountPickerProps = {
  value: number | null;
  displayLabel?: string | null;
  onSelect: (account: ApiAccount) => void;
  onClear: () => void;
  disabled?: boolean;
  required?: boolean;
};

function accountSubtitle(account: ApiAccount): string | null {
  if (account.account_type?.trim()) return account.account_type.trim();
  if (account.phone?.trim()) return account.phone.trim();
  if (account.email?.trim()) return account.email.trim();
  return account.account_number || null;
}

export function AccountPicker({
  value,
  displayLabel,
  onSelect,
  onClear,
  disabled,
  required,
}: AccountPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchAccounts({ search: search.trim() || undefined, per_page: 30 })
        .then((res) => {
          if (!cancelled) setAccounts(res.data);
        })
        .catch(() => {
          if (!cancelled) setAccounts([]);
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

  const selectedAccount = value ? accounts.find((a) => a.id === value) : null;
  const buttonLabel =
    displayLabel ??
    (selectedAccount ? selectedAccount.name : null) ??
    (required ? "Select account…" : "Search accounts…");

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-required={required}
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
              placeholder="Search by name, email, phone…"
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
                  <CommandEmpty>No accounts found.</CommandEmpty>
                  <CommandGroup>
                    {accounts.map((account) => {
                      const subtitle = accountSubtitle(account);
                      return (
                        <CommandItem
                          key={account.id}
                          value={String(account.id)}
                          onSelect={() => {
                            onSelect(account);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === account.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{account.name}</p>
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
          aria-label="Clear selected account"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

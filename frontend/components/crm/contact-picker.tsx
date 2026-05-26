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
  contactDisplayName,
  fetchContacts,
  type ApiContact,
} from "@/lib/api/crm/contacts";

type ContactPickerProps = {
  value: number | null;
  displayLabel?: string | null;
  accountId?: number | null;
  onSelect: (contact: ApiContact) => void;
  onClear: () => void;
  disabled?: boolean;
};

function contactSubtitle(contact: ApiContact): string | null {
  if (contact.account?.name?.trim()) return contact.account.name.trim();
  if (contact.phone?.trim()) return contact.phone.trim();
  if (contact.email?.trim()) return contact.email.trim();
  return contact.contact_number || null;
}

export function ContactPicker({
  value,
  displayLabel,
  accountId,
  onSelect,
  onClear,
  disabled,
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchContacts({
        search: search.trim() || undefined,
        account_id: accountId ?? undefined,
        per_page: 30,
      })
        .then((res) => {
          if (!cancelled) setContacts(res.data);
        })
        .catch(() => {
          if (!cancelled) setContacts([]);
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

  const selectedContact = value ? contacts.find((c) => c.id === value) : null;
  const buttonLabel =
    displayLabel ??
    (selectedContact ? contactDisplayName(selectedContact) : null) ??
    "Search contacts…";

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
              placeholder="Search by name, phone, email…"
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
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {contacts.map((contact) => {
                      const subtitle = contactSubtitle(contact);
                      return (
                        <CommandItem
                          key={contact.id}
                          value={String(contact.id)}
                          onSelect={() => {
                            onSelect(contact);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === contact.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{contactDisplayName(contact)}</p>
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
          aria-label="Clear selected contact"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AccountsTable } from "@/components/crm/accounts-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Accounts"
        subtitle="Manage customer and partner accounts"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search accounts..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active_opportunity">Active Opportunity</SelectItem>
              <SelectItem value="active_customer">Active Customer</SelectItem>
              <SelectItem value="repeat_customer">Repeat Customer</SelectItem>
              <SelectItem value="dormant">Dormant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AccountsTable search={search} status={status} />
      </div>
    </div>
  );
}
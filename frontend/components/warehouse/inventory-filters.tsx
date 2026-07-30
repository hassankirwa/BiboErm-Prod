"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogTier } from "@/lib/api/warehouse";
import { Search, RefreshCw } from "lucide-react";

type InventoryFiltersProps = {
  search: string;
  category: string;
  tier: CatalogTier | "all";
  stockStatus: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTierChange: (value: CatalogTier | "all") => void;
  onStockStatusChange: (value: string) => void;
  onRefresh: () => void;
};

export function InventoryFilters({
  search,
  category,
  tier,
  stockStatus,
  onSearchChange,
  onCategoryChange,
  onTierChange,
  onStockStatusChange,
  onRefresh,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by code, name, or description..."
            className="pl-8 h-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="aluminium_profile">Aluminium Profiles</SelectItem>
            <SelectItem value="accessory">Accessories</SelectItem>
            <SelectItem value="rubber">Rubbers & Gaskets</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={(value) => onTierChange(value as CatalogTier | "all")}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="balustrade">Balustrade</SelectItem>
            <SelectItem value="specialty">Specialty</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockStatus} onValueChange={onStockStatusChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="zero">Zero Stock</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

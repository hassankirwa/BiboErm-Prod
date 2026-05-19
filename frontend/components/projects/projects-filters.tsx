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
import { Search, Filter, Download, LayoutGrid, List } from "lucide-react";

export function ProjectsFilters() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="pl-8 h-9"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="design">Design Phase</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="installation">Installation</SelectItem>
            <SelectItem value="qc">Quality Control</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="apartment_block">Apartment Block</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="h-4 w-4" />
          More Filters
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <div className="flex border border-border rounded-md">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none border-l border-border">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { AppHeader } from "@/components/app-header";
import { NCRList } from "@/components/qc/ncr-list";
import { NCRStats } from "@/components/qc/ncr-stats";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NCRPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Non-Conformance Reports"
        subtitle="Track and resolve quality issues"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            Create NCR
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <NCRStats />
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search NCRs..."
                className="pl-8 h-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NCRList />
        </div>
      </div>
    </div>
  );
}

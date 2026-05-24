import { AppHeader } from "@/components/app-header";
import { QCInspectionsList } from "@/components/qc/qc-inspections-list";
import { QCStats } from "@/components/qc/qc-stats";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function QCInspectionsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Inspections"
        subtitle="Quality control and inspections"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            New Inspection
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <QCStats />
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inspections..."
                className="pl-8 h-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="pre_production">Pre-Production</SelectItem>
                <SelectItem value="post_fabrication">Post-Fabrication</SelectItem>
                <SelectItem value="pre_installation">Pre-Installation</SelectItem>
                <SelectItem value="site_installation">Site Installation</SelectItem>
                <SelectItem value="snagging_signoff">Snagging</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <QCInspectionsList />
        </div>
      </div>
    </div>
  );
}

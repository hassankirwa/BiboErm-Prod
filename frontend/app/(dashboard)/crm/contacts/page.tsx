import { AppHeader } from "@/components/app-header";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { ContactsTable } from "@/components/crm/contacts-table";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ContactsPage() {
  return (
    <CrmPageShell>
      <AppHeader
        title="Contacts"
        subtitle="Manage your client contacts"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 sm:w-auto">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm" className="h-8 w-full gap-1.5 sm:w-auto">
              <Plus className="h-4 w-4" />
              New Contact
            </Button>
          </div>
        }
      />
      <CrmPageContent>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contacts..."
              className="h-9 w-full pl-8"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 sm:w-auto">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <ContactsTable />
      </CrmPageContent>
    </CrmPageShell>
  );
}

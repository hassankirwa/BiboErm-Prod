import { AppHeader } from "@/components/app-header";
import { ContactsTable } from "@/components/crm/contacts-table";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ContactsPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Contacts"
        subtitle="Manage your client contacts"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              New Contact
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search contacts..."
                className="pl-8 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          <ContactsTable />
        </div>
      </div>
    </div>
  );
}

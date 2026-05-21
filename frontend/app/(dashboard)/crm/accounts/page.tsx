import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CrmPageContent, CrmPageShell, CrmPageTitleRow } from "@/components/crm/crm-page-shell";
import { Building2, Search, Plus, MoreHorizontal, MapPin, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const accounts = [
  { id: "ACC001", name: "ABC Construction Ltd", industry: "Construction", type: "Customer", contacts: 5, deals: 3, revenue: "$1.2M", status: "Active", location: "Nairobi" },
  { id: "ACC002", name: "XYZ Developers", industry: "Real Estate", type: "Customer", contacts: 8, deals: 5, revenue: "$2.5M", status: "Active", location: "Mombasa" },
  { id: "ACC003", name: "Metro Building Co.", industry: "Construction", type: "Prospect", contacts: 3, deals: 1, revenue: "$450K", status: "Active", location: "Kisumu" },
  { id: "ACC004", name: "Prime Properties", industry: "Real Estate", type: "Customer", contacts: 4, deals: 2, revenue: "$800K", status: "Inactive", location: "Nairobi" },
  { id: "ACC005", name: "Urban Architects", industry: "Architecture", type: "Partner", contacts: 2, deals: 4, revenue: "$600K", status: "Active", location: "Nakuru" },
];

export default function AccountsPage() {
  return (
    <CrmPageShell>
      <CrmPageContent>
        <CrmPageTitleRow
          title="Accounts"
          subtitle="Manage customer and partner accounts"
          actions={
            <Button className="h-9 w-full rounded-[5px] sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          }
        />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-semibold">248</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-semibold">186</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-semibold">$12.4M</p>
              </div>
              <div className="text-success text-sm">+18%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-2xl font-semibold">12</p>
              </div>
              <div className="text-primary text-sm">+3</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 rounded-[5px]">
        <CardHeader className="pb-3">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-medium">All Accounts</CardTitle>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search accounts..." className="h-9 w-full rounded-[5px] pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="h-9 w-full rounded-[5px] sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 w-full rounded-[5px] sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-[5px] bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{account.industry}</TableCell>
                  <TableCell>
                    <Badge variant={account.type === "Customer" ? "default" : account.type === "Partner" ? "secondary" : "outline"} className="rounded-[5px]">
                      {account.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.contacts}</TableCell>
                  <TableCell className="font-medium">{account.revenue}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {account.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.status === "Active" ? "default" : "secondary"} className="rounded-[5px]">
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Account</DropdownMenuItem>
                        <DropdownMenuItem>Add Contact</DropdownMenuItem>
                        <DropdownMenuItem>Create Deal</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </CrmPageContent>
    </CrmPageShell>
  );
}

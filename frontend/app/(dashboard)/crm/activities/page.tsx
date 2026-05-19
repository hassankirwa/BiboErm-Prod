import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Search, Plus, MoreHorizontal, Phone, Mail, CheckCircle2, Clock, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const activities = [
  { id: "ACT001", type: "Call", subject: "Follow-up call", contact: "John Mwangi", account: "ABC Construction", assignee: "Sarah Otieno", dueDate: "2024-01-15", status: "Completed", priority: "High" },
  { id: "ACT002", type: "Meeting", subject: "Product demo", contact: "Mary Wanjiku", account: "XYZ Developers", assignee: "James Kamau", dueDate: "2024-01-16", status: "Scheduled", priority: "High" },
  { id: "ACT003", type: "Email", subject: "Send proposal", contact: "Peter Ochieng", account: "Metro Building", assignee: "Sarah Otieno", dueDate: "2024-01-17", status: "Pending", priority: "Medium" },
  { id: "ACT004", type: "Task", subject: "Prepare quotation", contact: "Jane Akinyi", account: "Prime Properties", assignee: "David Njoroge", dueDate: "2024-01-18", status: "In Progress", priority: "High" },
  { id: "ACT005", type: "Call", subject: "Contract discussion", contact: "Samuel Kiprop", account: "Urban Architects", assignee: "James Kamau", dueDate: "2024-01-19", status: "Pending", priority: "Low" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "default";
    case "Scheduled": return "secondary";
    case "In Progress": return "outline";
    default: return "outline";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "Call": return <Phone className="h-4 w-4" />;
    case "Email": return <Mail className="h-4 w-4" />;
    case "Meeting": return <Calendar className="h-4 w-4" />;
    default: return <CheckCircle2 className="h-4 w-4" />;
  }
};

export default function ActivitiesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
          <p className="text-sm text-muted-foreground">Track calls, meetings, emails and tasks</p>
        </div>
        <Button className="rounded-[5px]">
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Activities</p>
                <p className="text-2xl font-semibold">12</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-semibold text-destructive">5</p>
              </div>
              <Clock className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-semibold text-success">8</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-semibold">47</p>
              </div>
              <div className="text-muted-foreground text-sm">+12%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[5px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">All Activities</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search activities..." className="pl-9 w-64 h-9 rounded-[5px]" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-9 rounded-[5px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="rounded-[5px]">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-[5px] bg-muted flex items-center justify-center">
                        {getTypeIcon(activity.type)}
                      </div>
                      <span className="text-sm">{activity.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{activity.subject}</TableCell>
                  <TableCell>{activity.contact}</TableCell>
                  <TableCell className="text-muted-foreground">{activity.account}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{activity.assignee.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{activity.assignee}</span>
                    </div>
                  </TableCell>
                  <TableCell>{activity.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={activity.priority === "High" ? "destructive" : activity.priority === "Medium" ? "default" : "secondary"} className="rounded-[5px]">
                      {activity.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(activity.status) as "default" | "secondary" | "outline"} className="rounded-[5px]">
                      {activity.status}
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
                        <DropdownMenuItem>Edit Activity</DropdownMenuItem>
                        <DropdownMenuItem>Mark Complete</DropdownMenuItem>
                        <DropdownMenuItem>Reschedule</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

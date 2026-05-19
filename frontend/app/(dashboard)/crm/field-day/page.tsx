import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Clock, Users, Plus, Navigation, CheckCircle2, AlertCircle } from "lucide-react";

const fieldVisits = [
  { id: "FD001", site: "Westlands Tower Project", client: "ABC Construction", assignee: "James Kamau", date: "2024-01-15", time: "09:00 AM", status: "Completed", type: "Site Survey", location: "Westlands, Nairobi" },
  { id: "FD002", site: "Mombasa Mall Extension", client: "XYZ Developers", assignee: "Sarah Otieno", date: "2024-01-15", time: "02:00 PM", status: "In Progress", type: "Installation Check", location: "Nyali, Mombasa" },
  { id: "FD003", site: "Kisumu Lakefront", client: "Metro Building", assignee: "David Njoroge", date: "2024-01-16", time: "10:00 AM", status: "Scheduled", type: "Measurement", location: "Kisumu CBD" },
  { id: "FD004", site: "Nakuru Heights", client: "Prime Properties", assignee: "James Kamau", date: "2024-01-16", time: "03:00 PM", status: "Scheduled", type: "Quality Check", location: "Nakuru Town" },
  { id: "FD005", site: "Thika Road Office Park", client: "Urban Architects", assignee: "Sarah Otieno", date: "2024-01-17", time: "11:00 AM", status: "Pending", type: "Site Survey", location: "Thika Road" },
];

const teamMembers = [
  { name: "James Kamau", role: "Field Engineer", visits: 8, location: "On Site" },
  { name: "Sarah Otieno", role: "Sales Rep", visits: 6, location: "In Transit" },
  { name: "David Njoroge", role: "Technician", visits: 5, location: "Office" },
  { name: "Mary Wanjiku", role: "Field Engineer", visits: 7, location: "On Site" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "default";
    case "In Progress": return "secondary";
    case "Scheduled": return "outline";
    default: return "outline";
  }
};

export default function FieldDayPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Field Day</h1>
          <p className="text-sm text-muted-foreground">Manage site visits and field activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="today">
            <SelectTrigger className="w-40 h-9 rounded-[5px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Button className="rounded-[5px]">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Visit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Visits</p>
                <p className="text-2xl font-semibold">8</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-semibold text-primary">3</p>
              </div>
              <Navigation className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-semibold text-success">4</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team on Field</p>
                <p className="text-2xl font-semibold">6</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-[5px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Scheduled Visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fieldVisits.map((visit) => (
                <div key={visit.id} className="p-4 border border-border rounded-[5px] hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{visit.site}</h3>
                        <Badge variant={getStatusColor(visit.status) as "default" | "secondary" | "outline"} className="rounded-[5px]">
                          {visit.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{visit.client}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {visit.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {visit.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {visit.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{visit.assignee.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="rounded-[5px]">{visit.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[5px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Field Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-[5px]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={member.location === "On Site" ? "default" : member.location === "In Transit" ? "secondary" : "outline"} className="rounded-[5px]">
                      {member.location}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{member.visits} visits</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[5px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start rounded-[5px]">
                <Navigation className="h-4 w-4 mr-2" />
                Track Team Location
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-[5px]">
                <AlertCircle className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-[5px]">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Visit Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

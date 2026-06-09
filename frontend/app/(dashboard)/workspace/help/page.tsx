import Link from "next/link";
import {
  BookOpen,
  Headphones,
  Mail,
  Settings,
  Shield,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const helpTopics = [
  {
    title: "Getting started",
    description:
      "Open Bibo Workspace to jump between modules, pin favorites, and track recent work.",
    icon: BookOpen,
  },
  {
    title: "Roles & permissions",
    description:
      "Your sidebar and apps reflect your department and role. Contact your admin if something is missing.",
    icon: Shield,
  },
  {
    title: "Workflows",
    description:
      "Leads, projects, quotations, site visits, and production each follow their own stage in the CRM and operations modules.",
    icon: Workflow,
  },
] as const;

export default function WorkspaceHelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <Headphones className="size-6 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Guides and support for using Bibo Workspace.
        </p>
      </div>

      <div className="space-y-4">
        {helpTopics.map((topic) => (
          <Card key={topic.title}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <topic.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account & security</CardTitle>
            <CardDescription>
              Update your profile, password, or two-factor authentication in
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace/settings">
                <Settings className="size-4" />
                Open settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact support</CardTitle>
            <CardDescription>
              Need help with access, onboarding, or a bug? Reach out to the
              Bibo team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <a href="mailto:support@bibo.com">
                <Mail className="size-4" />
                support@bibo.com
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

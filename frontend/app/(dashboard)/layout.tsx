"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard mode="dashboard">
      <SidebarProvider
        className="h-dvh max-w-[100dvw] overflow-hidden"
        style={
          {
            "--sidebar-width": "13.5rem",
            "--sidebar-width-icon": "3rem",
          } as React.CSSProperties
        }
      >
        <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
          <AppTopbar />
          <div className="flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background">
              {children}
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}

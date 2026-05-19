"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Home,
  FileBarChart,
  PieChart,
  Settings,
  Headphones,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getActiveDepartment,
  isWorkspaceNavActive,
  workspaceNavItems,
  workspaceFooterNavItems,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  name,
  icon: Icon,
  isActive,
}: {
  href: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={name}
        className={cn(
          "sidebar-nav-item h-10 rounded-md px-3",
          isActive && "sidebar-nav-item-active"
        )}
      >
        <Link href={href}>
          <Icon
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              isActive ? "text-primary" : "text-neutral-500"
            )}
          />
          <span
            className={cn(
              "text-sm",
              isActive ? "font-semibold text-primary" : "font-medium text-neutral-700"
            )}
          >
            {name}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const topItemIcons: Record<string, ComponentType<{ className?: string }>> = {
  Home: Home,
  Reports: FileBarChart,
  Analytics: PieChart,
};

function SidebarLogo() {
  return (
    <SidebarHeader className="border-b border-neutral-200 px-4 py-3">
      <Link href="/workspace" className="flex items-center">
        <Image
          src="/image.png"
          alt="BIBO Windows & Doors"
          width={140}
          height={40}
          className="h-8 w-auto object-contain"
          priority
        />
      </Link>
    </SidebarHeader>
  );
}

function WorkspaceContent({ pathname }: { pathname: string }) {
  return (
    <SidebarContent className="overflow-y-auto overflow-x-hidden px-0 py-0">
      <SidebarGroup className="flex flex-1 flex-col p-0">
        <SidebarGroupContent className="flex flex-1 flex-col">
          <SidebarMenu className="flex flex-1 flex-col justify-evenly gap-1 px-3 py-6">
            {workspaceNavItems.map((item) => (
              <NavItem
                key={item.name}
                href={item.href}
                name={item.name}
                icon={item.icon}
                isActive={isWorkspaceNavActive(pathname, item.href)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-4 bg-neutral-200" />

      <SidebarGroup className="p-0 py-2">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1 px-3">
            {workspaceFooterNavItems.map((item) => (
              <NavItem
                key={item.name}
                href={item.href}
                name={item.name}
                icon={item.icon}
                isActive={isWorkspaceNavActive(pathname, item.href)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function DepartmentContent({
  department,
  pathname,
}: {
  department: NonNullable<ReturnType<typeof getActiveDepartment>>;
  pathname: string;
}) {
  const nav = department.nav;

  if (!nav) {
    return (
      <SidebarContent className="flex flex-col overflow-hidden px-0 py-3">
        <div className="sidebar-scroll-area min-h-0 flex-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-3">
                {department.subModules.map((sub) => (
                  <NavItem
                    key={sub.path}
                    href={sub.path}
                    name={sub.name}
                    icon={department.icon}
                    isActive={pathname === sub.path}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent className="flex flex-col overflow-hidden px-0 py-2">
      {/* Top nav: Home, Reports, Analytics — fixed */}
      <SidebarGroup className="shrink-0 p-0">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1 px-3">
            {nav.topItems.map((item) => {
              const Icon = topItemIcons[item.name] ?? Home;
              const isActive = pathname === item.path;
              return (
                <NavItem
                  key={item.name}
                  href={item.path}
                  name={item.name}
                  icon={Icon}
                  isActive={isActive}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-4 my-3 shrink-0 bg-neutral-200" />

      {/* Collapsible groups — scrollable area */}
      <div className="sidebar-scroll-area min-h-0 flex-1">
        {nav.groups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupActive = group.items.some(
            (item) => pathname === item.path
          );

          return (
            <Collapsible
              key={group.label}
              defaultOpen={isGroupActive}
              className="group/dept-collapsible"
            >
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0 px-3">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="h-10 rounded-md px-3 hover:bg-neutral-100"
                          tooltip={group.label}
                        >
                          <GroupIcon className="h-[18px] w-[18px] shrink-0 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-700">
                            {group.label}
                          </span>
                          <ChevronDown className="ml-auto h-4 w-4 text-neutral-400 transition-transform group-data-[state=open]/dept-collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>

                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 border-l-0 px-0 pl-5">
                        {group.items.map((item) => (
                          <SidebarMenuSubItem key={item.path + item.name}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.path}
                              className={cn(
                                "text-neutral-600 hover:text-neutral-900",
                                pathname === item.path && "sidebar-sub-active"
                              )}
                            >
                              <Link href={item.path}>
                                <span>{item.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </div>

      <SidebarSeparator className="mx-4 my-3 shrink-0 bg-neutral-200" />

      {/* Settings + Help — fixed at bottom */}
      <SidebarGroup className="shrink-0 p-0">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1 px-3">
            <NavItem
              href="/workspace/settings"
              name="Settings"
              icon={Settings}
              isActive={pathname === "/workspace/settings"}
            />
            <NavItem
              href="/workspace/help"
              name="Help Center"
              icon={Headphones}
              isActive={pathname === "/workspace/help"}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const activeDepartment = getActiveDepartment(pathname);
  const isWorkspace = activeDepartment === null;

  return (
    <Sidebar className="border-r border-neutral-200">
      <SidebarLogo />
      {isWorkspace ? (
        <WorkspaceContent pathname={pathname} />
      ) : (
        <DepartmentContent department={activeDepartment} pathname={pathname} />
      )}
    </Sidebar>
  );
}

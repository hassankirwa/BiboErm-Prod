"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Home,
  FileBarChart,
  PieChart,
  Settings,
  Headphones,
  LayoutGrid,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/auth-context";
import { canAccessWorkspaceHub, isWorkspaceHubPath } from "@/lib/auth/redirect";
import {
  getActiveDepartment,
  getPrimaryDepartmentNav,
  filterDepartmentNav,
  isWorkspaceNavActive,
  isWorkspaceSettingsPath,
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
  const { isMobile, setOpenMobile } = useSidebar();

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
        <Link
          href={href}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
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

function SidebarCollapseButton() {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200/60"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white">
        <ChevronLeft className="h-3.5 w-3.5" />
      </span>
      Collapse
    </button>
  );
}

function WorkspaceContent({ pathname }: { pathname: string }) {
  return (
    <>
      <SidebarContent className="flex flex-1 flex-col overflow-hidden px-0 py-0">
        <SidebarGroup className="shrink-0 p-0 pt-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-3">
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

        <SidebarSeparator className="mx-3 my-3 bg-neutral-200" />

        <SidebarGroup className="shrink-0 p-0">
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

        <div className="flex-1" />
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-t border-neutral-200 p-3">
        <SidebarCollapseButton />
      </SidebarFooter>
    </>
  );
}

function DepartmentContent({
  department,
  pathname,
  showWorkspaceLink = false,
}: {
  department: NonNullable<ReturnType<typeof getActiveDepartment>>;
  pathname: string;
  showWorkspaceLink?: boolean;
}) {
  const nav = department.nav;
  const workspaceLink = showWorkspaceLink ? (
    <NavItem
      href="/workspace"
      name="Workspace"
      icon={LayoutGrid}
      isActive={false}
    />
  ) : null;

  if (!nav) {
    return (
      <>
        <SidebarContent className="flex flex-1 flex-col overflow-hidden px-0 py-3">
          <div className="sidebar-scroll-area min-h-0 flex-1">
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 px-3">
                  {workspaceLink}
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
        <SidebarFooter className="mt-auto shrink-0 border-t border-neutral-200 p-3">
          <SidebarCollapseButton />
        </SidebarFooter>
      </>
    );
  }

  return (
    <>
      <SidebarContent className="flex flex-1 flex-col overflow-hidden px-0 py-3">
        <SidebarGroup className="shrink-0 p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-3">
              {workspaceLink}
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

        <SidebarSeparator className="mx-3 my-3 shrink-0 bg-neutral-200" />

        <div className="sidebar-scroll-area min-h-0 flex-1">
          {nav.groups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.items.some(
              (item) => pathname === item.path,
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
                                  pathname === item.path && "sidebar-sub-active",
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

        <SidebarSeparator className="mx-3 my-3 shrink-0 bg-neutral-200" />

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

      <SidebarFooter className="mt-auto shrink-0 border-t border-neutral-200 p-3">
        <SidebarCollapseButton />
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { roles, departments, permissions } = useAuth();
  const canWorkspace = canAccessWorkspaceHub(roles);
  const isSuperAdmin = roles.includes("super_admin");
  const activeDepartment = getActiveDepartment(pathname);
  const primaryDepartment = getPrimaryDepartmentNav(departments);

  const filterDepartment = (
    department: NonNullable<ReturnType<typeof getActiveDepartment>>,
  ) => filterDepartmentNav(department, permissions, roles);

  const showWorkspaceSidebar =
    (isWorkspaceHubPath(pathname) && canWorkspace) ||
    (isWorkspaceSettingsPath(pathname) && canWorkspace);

  const showDepartmentSidebar =
    activeDepartment !== null ||
    (isWorkspaceSettingsPath(pathname) && !canWorkspace && primaryDepartment !== null);

  const sidebarDepartmentRaw =
    activeDepartment ?? (showDepartmentSidebar ? primaryDepartment : null);
  const sidebarDepartment = sidebarDepartmentRaw
    ? filterDepartment(sidebarDepartmentRaw)
    : null;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-14 z-20 !h-[calc(100dvh-3.5rem)] border-r border-neutral-200 bg-[#f5f5f5]"
    >
      {showWorkspaceSidebar ? (
        <WorkspaceContent pathname={pathname} />
      ) : sidebarDepartment ? (
        <DepartmentContent
          department={sidebarDepartment}
          pathname={pathname}
          showWorkspaceLink={isSuperAdmin && !isWorkspaceHubPath(pathname)}
        />
      ) : primaryDepartment ? (
        <DepartmentContent
          department={filterDepartment(primaryDepartment)}
          pathname={pathname}
        />
      ) : canWorkspace ? (
        <WorkspaceContent pathname={pathname} />
      ) : null}
    </Sidebar>
  );
}

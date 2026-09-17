"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Home,
  FileBarChart,
  PieChart,
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
import { canAccessWorkspaceHub, canAccessWorkspaceInsights, isFieldModuleRole, isWorkspaceHubPath } from "@/lib/auth/redirect";
import { canPerformSiteVisitMeasurements } from "@/lib/crm/site-visit-paths";
import {
  departments,
  getActiveDepartment,
  getPrimaryDepartmentNav,
  filterDepartmentNav,
  isFieldModulePath,
  isDepartmentNavItemActive,
  isWorkspaceNavActive,
  isWorkspaceSettingsPath,
  workspaceNavItems,
  filterWorkspaceFooterNavItems,
  filterWorkspaceInsightsNavItems,
  footerHrefForDepartment,
  isWorkspaceShellPath,
  workspaceFooterNavGroup,
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
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span>{name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SelfServiceHrNav({
  pathname,
  department = null,
}: {
  pathname: string;
  department?: NonNullable<ReturnType<typeof getActiveDepartment>> | null;
}) {
  const footerItems = filterWorkspaceFooterNavItems();
  const GroupIcon = workspaceFooterNavGroup.icon;
  const resolvedItems = footerItems.map((item) => ({
    ...item,
    href: department
      ? footerHrefForDepartment(department, item.kind)
      : item.href,
  }));
  const isGroupActive = resolvedItems.some((item) =>
    isWorkspaceNavActive(pathname, item.href),
  );

  return (
    <Collapsible
      defaultOpen={isGroupActive}
      className="group/hr-self-collapsible"
    >
      <SidebarGroup className="shrink-0 p-0">
        <SidebarGroupContent>
          <SidebarMenu className="gap-0 px-3">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className="h-10 rounded-md px-3 hover:bg-neutral-100"
                  tooltip={workspaceFooterNavGroup.name}
                >
                  <GroupIcon className="h-[18px] w-[18px] shrink-0 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-700">
                    {workspaceFooterNavGroup.name}
                  </span>
                  <ChevronDown className="ml-auto h-4 w-4 text-neutral-400 transition-transform group-data-[state=open]/hr-self-collapsible:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>

            <CollapsibleContent>
              <SidebarMenuSub className="ml-4 border-l-0 px-0 pl-5">
                {resolvedItems.map((item) => {
                  const isActive = isWorkspaceNavActive(pathname, item.href);
                  const ItemIcon = item.icon;
                  return (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "text-neutral-600 hover:text-neutral-900",
                          isActive && "sidebar-sub-active",
                        )}
                      >
                        <Link href={item.href}>
                          <ItemIcon className="h-4 w-4 shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </Collapsible>
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

function WorkspaceContent({
  pathname,
  permissions,
  roles,
}: {
  pathname: string;
  permissions: string[];
  roles: string[];
}) {
  const insightsItems = filterWorkspaceInsightsNavItems(permissions, roles);
  const showFullWorkspaceNav = canAccessWorkspaceHub(roles);

  return (
    <>
      <SidebarContent className="flex flex-1 flex-col overflow-hidden px-0 py-0">
        {showFullWorkspaceNav ? (
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
        ) : null}

        {insightsItems.length > 0 ? (
          <>
            {showFullWorkspaceNav ? (
              <SidebarSeparator className="mx-3 my-3 bg-neutral-200" />
            ) : (
              <div className="pt-4" />
            )}
            <SidebarGroup className="shrink-0 p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 px-3">
                  {insightsItems.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      name={item.name}
                      icon={item.icon}
                      isActive={isWorkspaceNavActive(pathname, item.href)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}

        <SidebarSeparator className="mx-3 my-3 bg-neutral-200" />

        <SelfServiceHrNav pathname={pathname} />

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
  search = "",
  showWorkspaceLink = false,
  permissions,
  roles,
}: {
  department: NonNullable<ReturnType<typeof getActiveDepartment>>;
  pathname: string;
  search?: string;
  showWorkspaceLink?: boolean;
  permissions: string[];
  roles: string[];
}) {
  const insightsItems =
    department.id === "workspace"
      ? filterWorkspaceInsightsNavItems(permissions, roles)
      : [];
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
                      isActive={isDepartmentNavItemActive(
                        pathname,
                        sub.path,
                        sub.exact,
                        search,
                      )}
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
                const isActive = isDepartmentNavItemActive(
                  pathname,
                  item.path,
                  item.exact,
                  search,
                );
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
            const isGroupActive = group.items.some((item) =>
              isDepartmentNavItemActive(pathname, item.path, item.exact, search),
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
                          {group.items.map((item) => {
                            const isActive = isDepartmentNavItemActive(
                              pathname,
                              item.path,
                              item.exact,
                              search,
                            );
                            return (
                              <SidebarMenuSubItem key={item.path + item.name}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive}
                                  className={cn(
                                    "text-neutral-600 hover:text-neutral-900",
                                    isActive && "sidebar-sub-active",
                                  )}
                                >
                                  <Link href={item.path}>
                                    <span>{item.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
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

        {insightsItems.length > 0 ? (
          <SidebarGroup className="shrink-0 p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-3">
                {insightsItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    name={item.name}
                    icon={item.icon}
                    isActive={isWorkspaceNavActive(pathname, item.href)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {insightsItems.length > 0 ? (
          <SidebarSeparator className="mx-3 my-3 shrink-0 bg-neutral-200" />
        ) : null}

        <SelfServiceHrNav pathname={pathname} department={department} />
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-t border-neutral-200 p-3">
        <SidebarCollapseButton />
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { roles, departments, permissions } = useAuth();
  const canWorkspace = canAccessWorkspaceHub(roles);
  const canWorkspaceInsights = canAccessWorkspaceInsights(roles);
  const isSuperAdmin = roles.includes("super_admin");
  const activeDepartment = getActiveDepartment(pathname);
  const primaryDepartment = getPrimaryDepartmentNav(departments, roles);
  const onWorkspaceShell = isWorkspaceShellPath(pathname);
  const canUseFieldSidebar =
    isFieldModuleRole(roles) ||
    canPerformSiteVisitMeasurements(permissions, roles);

  const fieldDepartment = canUseFieldSidebar
    ? departments.find((department) => department.id === "field") ?? null
    : null;

  const filterDepartment = (
    department: NonNullable<ReturnType<typeof getActiveDepartment>>,
  ) => filterDepartmentNav(department, permissions, roles);

  const showWorkspaceSidebar =
    (onWorkspaceShell && canWorkspaceInsights) ||
    (isWorkspaceHubPath(pathname) &&
      canWorkspace &&
      activeDepartment?.id !== "workspace") ||
    (isWorkspaceSettingsPath(pathname) &&
      canWorkspace &&
      activeDepartment?.id !== "workspace");
  const fieldSidebarFallback =
    fieldDepartment && isFieldModulePath(pathname) ? fieldDepartment : null;

  const sidebarDepartmentSource =
    onWorkspaceShell && canWorkspaceInsights
      ? null
      : activeDepartment ??
        fieldSidebarFallback ??
        (isWorkspaceSettingsPath(pathname) && !canWorkspace
          ? primaryDepartment
          : null) ??
        primaryDepartment;

  const sidebarDepartment = sidebarDepartmentSource
    ? filterDepartment(sidebarDepartmentSource)
    : null;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-14 z-20 !h-[calc(100dvh-3.5rem)] border-r border-neutral-200 bg-[#f5f5f5]"
    >
      {showWorkspaceSidebar ? (
        <WorkspaceContent pathname={pathname} permissions={permissions} roles={roles} />
      ) : sidebarDepartment ? (
        <DepartmentContent
          department={sidebarDepartment}
          pathname={pathname}
          search={search}
          showWorkspaceLink={isSuperAdmin && !isWorkspaceHubPath(pathname)}
          permissions={permissions}
          roles={roles}
        />
      ) : canWorkspaceInsights ? (
        <WorkspaceContent pathname={pathname} permissions={permissions} roles={roles} />
      ) : canWorkspace ? (
        <WorkspaceContent pathname={pathname} permissions={permissions} roles={roles} />
      ) : null}
    </Sidebar>
  );
}

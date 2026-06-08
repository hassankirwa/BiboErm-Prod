import type { LucideIcon } from "lucide-react";
import { isFieldModuleRole } from "@/lib/auth/redirect";
import {
  LayoutGrid,
  Star,
  Clock,
  Pin,
  Settings,
  Headphones,
  Users,
  FolderKanban,
  Calculator,
  Warehouse,
  Contact,
  Briefcase,
  Box,
  FileText,
  Scissors,
  Receipt,
  Factory,
  ShieldCheck,
  Truck,
  Wrench,
  CircleDollarSign,
  UserCog,
  BarChart3,
  Globe,
  Monitor,
  ShoppingCart,
  ClipboardCheck,
  DollarSign,
  Home,
  PieChart,
  HandshakeIcon,
  ListTodo,
  PhoneCall,
  Video,
  Package,
  MapPin,
  ClipboardList,
  Megaphone,
  Banknote,
  FileBarChart,
  CheckSquare,
  AlertCircle,
  Layers,
  CreditCard,
  TrendingUp,
  Building,
  UserCheck,
  CalendarDays,
  FileStack,
  Shield,
  HardDrive,
  ScrollText,
} from "lucide-react";

export type SubModule = {
  name: string;
  path: string;
  /** When true, only highlight on exact path match (not child routes). */
  exact?: boolean;
  /** Spatie permission required to show this nav item */
  permission?: string;
  /** Show when the user has any of these permissions (OR). Overrides `permission` when set. */
  anyPermissions?: string[];
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: SubModule[];
};

export type DepartmentNav = {
  topItems: SubModule[];
  groups: NavGroup[];
};

export type Department = {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
  subModules: SubModule[];
  nav?: DepartmentNav;
};

export const departments: Department[] = [
  {
    id: "crm",
    name: "CRM",
    icon: Users,
    path: "/crm",
    subModules: [
      { name: "Leads", path: "/crm/leads" },
      { name: "Contacts", path: "/crm/contacts" },
      { name: "Accounts", path: "/crm/accounts" },
      { name: "Deals", path: "/crm/deals" },
      { name: "Projects", path: "/crm/projects", permission: "projects.view" },
      { name: "Site Visits", path: "/crm/site-visits" },
      { name: "Field Day", path: "/crm/field-day", permission: "field_day.view" },
      {
        name: "Field Day Reports",
        path: "/crm/field-day/reports",
        permission: "field_day.view",
      },
      { name: "Activities", path: "/crm/activities" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/crm" },
        { name: "Reports", path: "/crm/reports" },
        { name: "Analytics", path: "/crm/analytics" },
      ],
      groups: [
        {
          label: "Sales",
          icon: HandshakeIcon,
          items: [
            { name: "Leads", path: "/crm/leads" },
            { name: "Contacts", path: "/crm/contacts" },
            { name: "Accounts", path: "/crm/accounts" },
            { name: "Deals", path: "/crm/deals" },
            { name: "Projects", path: "/crm/projects", permission: "projects.view" },
            { name: "Site Visits", path: "/crm/site-visits" },
            { name: "Today", path: "/crm/site-visits/today" },
            {
              name: "Field Day",
              path: "/crm/field-day",
              permission: "field_day.view",
            },
            {
              name: "Field Day Reports",
              path: "/crm/field-day/reports",
              permission: "field_day.view",
            },
          ],
        },
        {
          label: "Activities",
          icon: ListTodo,
          items: [
            { name: "All Activities", path: "/crm/activities", exact: true },
            { name: "Tasks", path: "/crm/activities/tasks" },
            { name: "Meetings", path: "/crm/activities/meetings" },
            { name: "Calls", path: "/crm/activities/calls" },
          ],
        },
      ],
    },
  },
  {
    id: "projects",
    name: "Projects",
    icon: FolderKanban,
    path: "/projects",
    subModules: [
      { name: "All Projects", path: "/projects" },
      { name: "Pipeline", path: "/projects/pipeline" },
      { name: "Design", path: "/projects/design", permission: "projects.view" },
      { name: "Quotation", path: "/projects/quotations", permission: "quotations.view" },
      { name: "Timeline", path: "/projects/timeline" },
      { name: "Client Portal", path: "/projects/client-portal" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/projects" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Projects",
          icon: FolderKanban,
          items: [
            { name: "All Projects", path: "/projects" },
            { name: "Pipeline", path: "/projects/pipeline" },
            { name: "Design", path: "/projects/design", permission: "projects.view" },
            { name: "Quotation", path: "/projects/quotations", permission: "quotations.view" },
            { name: "Timeline", path: "/projects/timeline" },
            { name: "Client Portal", path: "/projects/client-portal" },
          ],
        },
      ],
    },
  },
  {
    id: "warehouse",
    name: "Warehouse",
    icon: Warehouse,
    path: "/warehouse",
    subModules: [
      { name: "Inventory", path: "/warehouse/inventory", permission: "warehouse.stock.view" },
      { name: "Receive", path: "/warehouse/receive", permission: "warehouse.stock.receive" },
      { name: "Receiving Logs", path: "/warehouse/receiving-logs", permission: "warehouse.stock.receive" },
      { name: "Stock Movements", path: "/warehouse/movements", permission: "warehouse.stock.view" },
      { name: "Offcuts", path: "/warehouse/offcuts", permission: "warehouse.offcuts.manage" },
      { name: "Tools", path: "/warehouse/tools", permission: "warehouse.tools.view" },
      { name: "Project Pipeline", path: "/warehouse/projects", permission: "projects.view" },
      { name: "Master Data", path: "/warehouse/master-data", permission: "warehouse.master_data.view" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/warehouse/inventory", permission: "warehouse.stock.view" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Inventory",
          icon: Package,
          items: [
            { name: "Inventory", path: "/warehouse/inventory", permission: "warehouse.stock.view" },
            { name: "Receive", path: "/warehouse/receive", permission: "warehouse.stock.receive" },
            { name: "Receiving Logs", path: "/warehouse/receiving-logs", permission: "warehouse.stock.receive" },
            { name: "Stock Movements", path: "/warehouse/movements", permission: "warehouse.stock.view" },
            { name: "Offcuts", path: "/warehouse/offcuts", permission: "warehouse.offcuts.manage" },
            { name: "Tools", path: "/warehouse/tools", permission: "warehouse.tools.view" },
            { name: "Project Pipeline", path: "/warehouse/projects", permission: "projects.view" },
            { name: "Master Data", path: "/warehouse/master-data", permission: "warehouse.master_data.view" },
          ],
        },
      ],
    },
  },
  {
    id: "procurement",
    name: "Procurement",
    icon: ShoppingCart,
    path: "/procurement",
    subModules: [
      { name: "Dashboard", path: "/procurement/dashboard", permission: "procurement.view" },
      { name: "Stock Management", path: "/procurement/stock", permission: "procurement.view" },
      { name: "Stock Analytics", path: "/procurement/stock-analytics", permission: "procurement.view" },
      { name: "Purchase Orders", path: "/procurement/orders", permission: "procurement.view" },
      { name: "Receiving Logs", path: "/procurement/goods-receipts", permission: "procurement.view" },
      { name: "Suppliers", path: "/procurement/suppliers", permission: "procurement.view" },
      { name: "Drivers", path: "/procurement/drivers", permission: "procurement.view" },
      { name: "Requisitions", path: "/procurement/requisitions", permission: "procurement.view" },
      { name: "Create Requisition", path: "/procurement/requisitions/create", permission: "procurement.manage" },
      { name: "Project Materials", path: "/procurement/project-materials", permission: "procurement.view" },
      { name: "Transport", path: "/procurement/transport", permission: "procurement.manage" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/procurement/dashboard", permission: "procurement.view" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/procurement/stock-analytics", permission: "procurement.view" },
      ],
      groups: [
        {
          label: "Procurement",
          icon: ShoppingCart,
          items: [
            { name: "Dashboard", path: "/procurement/dashboard", permission: "procurement.view" },
            { name: "Stock Management", path: "/procurement/stock", permission: "procurement.view" },
            { name: "Stock Analytics", path: "/procurement/stock-analytics", permission: "procurement.view" },
            { name: "Purchase Orders", path: "/procurement/orders", permission: "procurement.view" },
      { name: "Receiving Logs", path: "/procurement/goods-receipts", permission: "procurement.view" },
            { name: "Suppliers", path: "/procurement/suppliers", permission: "procurement.view" },
            { name: "Drivers", path: "/procurement/drivers", permission: "procurement.view" },
            { name: "Requisitions", path: "/procurement/requisitions", permission: "procurement.view" },
            { name: "Create Requisition", path: "/procurement/requisitions/create", permission: "procurement.manage" },
            { name: "Project Materials", path: "/procurement/project-materials", permission: "procurement.view" },
            { name: "Transport", path: "/procurement/transport", permission: "procurement.manage" },
          ],
        },
      ],
    },
  },
  {
    id: "production",
    name: "Production",
    icon: Factory,
    path: "/production",
    subModules: [
      { name: "Schedule", path: "/production/schedule" },
      { name: "Orders", path: "/production/orders" },
      { name: "Cutting", path: "/production/cutting" },
      { name: "Assembly", path: "/production/assembly" },
      { name: "Schedule", path: "/production/schedule", permission: "production.view" },
      { name: "Orders", path: "/production/orders", permission: "production.view" },
      { name: "Cutting", path: "/production/cutting", permission: "production.view" },
      { name: "Assembly", path: "/production/assembly", permission: "production.view" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/production/schedule", permission: "production.view" },
        { name: "Reports", path: "/analytics", permission: "analytics.view" },
        { name: "Analytics", path: "/analytics", permission: "analytics.view" },
      ],
      groups: [
        {
          label: "Production",
          icon: Factory,
          items: [
            { name: "Schedule", path: "/production/schedule" },
            { name: "Orders", path: "/production/orders" },
            { name: "Cutting", path: "/production/cutting" },
            { name: "Assembly", path: "/production/assembly" },
          ],
        },
      ],
    },
  },
  {
    id: "field",
    name: "Field",
    icon: MapPin,
    path: "/field",
    subModules: [
      { name: "Home", path: "/field" },
      {
        name: "Open Deal Visits",
        path: "/field/open-visits",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      {
        name: "Today's Visits",
        path: "/field/site-visits/today",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      {
        name: "Site Visits",
        path: "/crm/site-visits",
        anyPermissions: [
          "site_visits.view",
          "site_visits.execute",
          "field_installation.view",
          "field_installation.log",
        ],
      },
      {
        name: "Installation Jobs",
        path: "/field-installation/jobs",
        permission: "field_installation.view",
      },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/field" },
        {
          name: "Open Deal Visits",
          path: "/field/open-visits",
          anyPermissions: ["site_visits.execute", "field_installation.log"],
        },
        {
          name: "Today's Visits",
          path: "/field/site-visits/today",
          anyPermissions: ["site_visits.execute", "field_installation.log"],
        },
      ],
      groups: [
        {
          label: "Measurements",
          icon: ClipboardList,
          items: [
            {
              name: "Open Deal Visits",
              path: "/field/open-visits",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
            {
              name: "Today's Visits",
              path: "/field/site-visits/today",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
            {
              name: "All Site Visits",
              path: "/crm/site-visits",
              anyPermissions: [
                "site_visits.view",
                "site_visits.execute",
                "field_installation.view",
                "field_installation.log",
              ],
            },
          ],
        },
        {
          label: "Installation",
          icon: Wrench,
          items: [
            {
              name: "Jobs",
              path: "/field-installation/jobs",
              permission: "field_installation.view",
            },
          ],
        },
      ],
    },
  },
  {
    id: "qc",
    name: "Quality Control",
    icon: ClipboardCheck,
    path: "/qc",
    subModules: [
      { name: "Dashboard", path: "/qc/dashboard", permission: "qc.view" },
      { name: "Inspections", path: "/qc/inspections", permission: "qc.view" },
      { name: "Templates", path: "/qc/templates", permission: "qc.view" },
      { name: "Schedules", path: "/qc/schedules", permission: "qc.view" },
      { name: "Defects", path: "/qc/defects", permission: "qc.view" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/qc/dashboard" },
        { name: "Inspections", path: "/qc/inspections" },
        { name: "Defects", path: "/qc/defects" },
      ],
      groups: [
        {
          label: "Quality",
          icon: ClipboardCheck,
          items: [
            { name: "Dashboard", path: "/qc/dashboard", permission: "qc.view" },
            { name: "Inspections", path: "/qc/inspections", permission: "qc.view" },
            { name: "Templates", path: "/qc/templates", permission: "qc.view" },
            { name: "Schedules", path: "/qc/schedules", permission: "qc.view" },
            { name: "Defects", path: "/qc/defects", permission: "qc.view" },
          ],
        },
      ],
    },
  },
  {
    id: "hr",
    name: "HR",
    icon: UserCog,
    path: "/hr",
    subModules: [
      { name: "Employees", path: "/hr/employees" },
      { name: "Payroll", path: "/hr/payroll" },
      { name: "Leave", path: "/hr/leave" },
      { name: "Documents", path: "/hr/documents" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/hr" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "HR",
          icon: UserCog,
          items: [
            { name: "Employees", path: "/hr/employees" },
            { name: "Payroll", path: "/hr/payroll" },
            { name: "Leave", path: "/hr/leave" },
            { name: "Documents", path: "/hr/documents" },
          ],
        },
      ],
    },
  },
  {
    id: "finance",
    name: "Finance",
    icon: DollarSign,
    path: "/finance",
    subModules: [
      { name: "Invoices", path: "/finance/invoices" },
      { name: "Payments", path: "/finance/payments" },
      { name: "Expenses", path: "/finance/expenses" },
      { name: "Reports", path: "/finance/reports" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/finance/invoices" },
        { name: "Reports", path: "/finance/reports" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Finance",
          icon: DollarSign,
          items: [
            { name: "Invoices", path: "/finance/invoices" },
            { name: "Payments", path: "/finance/payments" },
            { name: "Expenses", path: "/finance/expenses" },
            { name: "Reports", path: "/finance/reports" },
          ],
        },
      ],
    },
  },
  {
    id: "it",
    name: "IT Admin",
    icon: Monitor,
    path: "/it",
    subModules: [
      { name: "Users", path: "/it/users" },
      { name: "Roles", path: "/it/roles" },
      { name: "Devices", path: "/it/devices" },
      { name: "Audit Log", path: "/it/audit-log" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/it/users" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "IT Admin",
          icon: Monitor,
          items: [
            { name: "Users", path: "/it/users" },
            { name: "Roles", path: "/it/roles" },
            { name: "Devices", path: "/it/devices" },
            { name: "Audit Log", path: "/it/audit-log" },
          ],
        },
      ],
    },
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart3,
    path: "/analytics",
    subModules: [{ name: "Overview", path: "/analytics" }],
  },
];

export type WorkspaceApp = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  badge?: { label: string; className: string };
  /** Spatie permission required to show this app tile */
  permission?: string;
  /** Show when the user has any of these permissions (OR). Overrides `permission` when set. */
  anyPermissions?: string[];
};

/** Routes that use the Field department sidebar (measurements, installation). */
const FIELD_MODULE_PATH_PREFIXES = [
  "/field",
  "/field-installation",
] as const;

export function isFieldModulePath(pathname: string): boolean {
  return FIELD_MODULE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const workspaceApps: WorkspaceApp[] = [
  {
    id: "crm",
    name: "CRM",
    href: "/crm",
    icon: Users,
    iconClassName: "bg-blue-100 text-blue-600",
    permission: "leads.view",
  },
  {
    id: "field",
    name: "Field",
    href: "/field",
    icon: MapPin,
    iconClassName: "bg-green-100 text-green-700",
    anyPermissions: [
      "site_visits.view",
      "site_visits.execute",
      "field_installation.view",
    ],
  },
  {
    id: "project-management",
    name: "Project Management",
    href: "/projects",
    icon: FolderKanban,
    iconClassName: "bg-purple-100 text-purple-600",
    permission: "projects.view",
  },
  {
    id: "estimations",
    name: "Estimations",
    href: "/projects/design",
    icon: Calculator,
    iconClassName: "bg-yellow-100 text-yellow-600",
    permission: "projects.view",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    href: "/warehouse/inventory",
    icon: Warehouse,
    iconClassName: "bg-orange-100 text-orange-600",
    badge: { label: "3 Low Stock", className: "text-orange-600" },
    permission: "warehouse.stock.view",
  },
  {
    id: "contacts",
    name: "Contacts",
    href: "/crm/contacts",
    icon: Contact,
    iconClassName: "bg-violet-100 text-violet-600",
  },
  {
    id: "projects",
    name: "Projects",
    href: "/projects",
    icon: Briefcase,
    iconClassName: "bg-amber-100 text-amber-600",
    badge: { label: "8 Active Jobs", className: "text-primary" },
  },
  {
    id: "bom",
    name: "BOM",
    href: "/projects",
    icon: Box,
    iconClassName: "bg-teal-100 text-teal-600",
  },
  {
    id: "quotes",
    name: "Quotes",
    href: "/projects/quotations",
    icon: FileText,
    iconClassName: "bg-pink-100 text-pink-600",
    permission: "quotations.view",
  },
  {
    id: "offcuts",
    name: "Offcuts",
    href: "/warehouse/offcuts",
    icon: Scissors,
    iconClassName: "bg-red-100 text-red-600",
    permission: "warehouse.offcuts.manage",
  },
  {
    id: "procurement",
    name: "Procurement",
    href: "/procurement/orders",
    icon: Receipt,
    iconClassName: "bg-emerald-100 text-emerald-600",
    badge: { label: "4 Pending", className: "text-teal-600" },
    permission: "procurement.view",
  },
  {
    id: "production",
    name: "Production",
    href: "/production/schedule",
    icon: Factory,
    iconClassName: "bg-sky-100 text-sky-600",
    permission: "production.view",
  },
  {
    id: "qc",
    name: "Quality Control",
    href: "/qc/dashboard",
    icon: ShieldCheck,
    iconClassName: "bg-cyan-100 text-cyan-600",
    permission: "qc.view",
  },
  {
    id: "dispatch",
    name: "Dispatch",
    href: "/production/schedule",
    icon: Truck,
    iconClassName: "bg-indigo-100 text-indigo-600",
    badge: { label: "2 Today", className: "text-indigo-600" },
  },
  {
    id: "finance",
    name: "Finance",
    href: "/finance/invoices",
    icon: CircleDollarSign,
    iconClassName: "bg-green-100 text-green-700",
    badge: { label: "2 Overdue", className: "text-green-600" },
    permission: "payroll.view",
  },
  {
    id: "hr",
    name: "HR",
    href: "/hr",
    icon: UserCog,
    iconClassName: "bg-rose-100 text-rose-600",
    badge: { label: "1 On Leave", className: "text-rose-600" },
    permission: "employees.view",
  },
  {
    id: "analytics",
    name: "Reports",
    href: "/analytics",
    icon: BarChart3,
    iconClassName: "bg-orange-100 text-orange-700",
  },
  {
    id: "client-portal",
    name: "Client Portal",
    href: "/projects/client-portal",
    icon: Globe,
    iconClassName: "bg-teal-100 text-teal-700",
  },
  {
    id: "it",
    name: "IT Admin",
    href: "/it/users",
    icon: Monitor,
    iconClassName: "bg-slate-100 text-slate-600",
    permission: "users.view",
  },
];

function hasNavPermission(
  permission: string | undefined,
  permissions: string[],
  roles: string[] = [],
  anyPermissions?: string[],
): boolean {
  if (roles.includes("super_admin")) return true;
  if (permissions.includes("*")) return true;
  if (
    roles.includes("field_officer") &&
    (permission === "site_visits.execute" ||
      anyPermissions?.includes("site_visits.execute"))
  ) {
    return true;
  }
  if (anyPermissions?.length) {
    return anyPermissions.some((p) => permissions.includes(p));
  }
  if (!permission) return true;
  return permissions.includes(permission);
}

export function filterSubModulesByPermissions(
  items: SubModule[],
  permissions: string[],
  roles: string[] = [],
): SubModule[] {
  return items.filter((item) =>
    hasNavPermission(
      item.permission,
      permissions,
      roles,
      item.anyPermissions,
    ),
  );
}

export function filterDepartmentNav(
  department: Department,
  permissions: string[],
  roles: string[] = [],
): Department {
  const subModules = filterSubModulesByPermissions(
    department.subModules,
    permissions,
    roles,
  );

  if (!department.nav) {
    return { ...department, subModules };
  }

  return {
    ...department,
    subModules,
    nav: {
      ...department.nav,
      topItems: filterSubModulesByPermissions(
        department.nav.topItems,
        permissions,
        roles,
      ),
      groups: department.nav.groups.map((group) => ({
        ...group,
        items: filterSubModulesByPermissions(group.items, permissions, roles),
      })),
    },
  };
}

export function filterAppsByPermissions(
  apps: WorkspaceApp[],
  permissions: string[],
  roles: string[] = []
): WorkspaceApp[] {
  return apps.filter((app) =>
    hasNavPermission(
      app.permission,
      permissions,
      roles,
      app.anyPermissions,
    ),
  );
}

export const workspaceNavItems = [
  { name: "Workspace", href: "/workspace", icon: LayoutGrid },
  { name: "Favorites", href: "/workspace/favorites", icon: Star },
  { name: "Recent", href: "/workspace/recent", icon: Clock },
  { name: "Pinned", href: "/workspace/pinned", icon: Pin },
] as const;

export const workspaceFooterNavItems = [
  { name: "Settings", href: "/workspace/settings", icon: Settings },
  { name: "Help Center", href: "/workspace/help", icon: Headphones },
] as const;

export function isWorkspaceNavActive(pathname: string, href: string): boolean {
  if (href === "/workspace") {
    return pathname === "/workspace";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const workspaceShellPrefixes = ["/analytics", "/notifications"];

function isProjectsModulePath(pathname: string): boolean {
  return pathname === "/projects" || pathname.startsWith("/projects/");
}

const SLUG_TO_DEPARTMENT_ID: Record<string, string> = {
  sales_marketing: "crm",
  production: "production",
  field: "field",
  field_installation: "field",
  warehouse: "warehouse",
  procurement: "procurement",
  quality_control: "qc",
  hr: "hr",
  finance: "finance",
  it: "it",
  project_management: "projects",
  operations: "analytics",
  reception: "crm",
};

export function getDepartmentNavForSlug(slug: string): Department | null {
  const departmentId = SLUG_TO_DEPARTMENT_ID[slug];
  if (!departmentId) return null;
  return departments.find((department) => department.id === departmentId) ?? null;
}

export function getPrimaryDepartmentNav(
  authDepartments: Array<{ slug: string; is_primary: boolean }>,
  roles: string[] = [],
): Department | null {
  if (isFieldModuleRole(roles)) {
    return departments.find((department) => department.id === "field") ?? null;
  }

  if (!authDepartments.length) return null;
  const primary =
    authDepartments.find((department) => department.is_primary) ??
    authDepartments[0];
  if (!primary) return null;
  return getDepartmentNavForSlug(primary.slug);
}

export function isWorkspaceSettingsPath(pathname: string): boolean {
  return (
    pathname === "/workspace/settings" ||
    pathname.startsWith("/workspace/settings/") ||
    pathname === "/workspace/help" ||
    pathname.startsWith("/workspace/help/")
  );
}

export function getActiveDepartment(pathname: string): Department | null {
  if (isProjectsModulePath(pathname)) {
    return departments.find((department) => department.id === "projects") ?? null;
  }

  if (isFieldModulePath(pathname)) {
    return departments.find((department) => department.id === "field") ?? null;
  }

  if (
    workspaceShellPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  const sorted = [...departments]
    .filter((d) => d.id !== "analytics")
    .sort((a, b) => b.path.length - a.path.length);

  for (const dept of sorted) {
    if (pathname === dept.path || pathname.startsWith(`${dept.path}/`)) {
      return dept;
    }
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return null;
  }

  return null;
}

export function isWorkspaceRoute(pathname: string): boolean {
  return getActiveDepartment(pathname) === null;
}

/** Match list routes and single-segment detail pages (e.g. /projects/12). */
export function isDepartmentNavItemActive(
  pathname: string,
  path: string,
  exact = false,
): boolean {
  if (pathname === path) {
    return true;
  }

  if (exact) {
    return false;
  }

  if (!pathname.startsWith(`${path}/`)) {
    return false;
  }

  const remainder = pathname.slice(path.length + 1);
  return remainder.length > 0 && !remainder.includes("/");
}

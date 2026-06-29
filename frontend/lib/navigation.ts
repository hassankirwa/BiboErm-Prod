import type { LucideIcon } from "lucide-react";
import { isFieldModuleRole, isWorkspaceSelfServicePath } from "@/lib/auth/redirect";
import { SITE_VISIT_MEASUREMENT_ROLES } from "@/lib/crm/site-visit-paths";
import {
  LayoutGrid,
  Star,
  Clock,
  Pin,
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
  FileBarChart,
  CheckSquare,
  AlertCircle,
  Layers,
  CreditCard,
  TrendingUp,
  Building,
  UserCheck,
  CalendarDays,
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
    id: "workspace",
    name: "Workspace",
    icon: LayoutGrid,
    path: "/workspace",
    subModules: [
      { name: "Home", path: "/workspace" },
      { name: "Today", path: "/workspace/today" },
      { name: "Tasks", path: "/workspace/tasks" },
      { name: "Calendar", path: "/workspace/calendar" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/workspace" },
        { name: "Today", path: "/workspace/today" },
        { name: "Tasks", path: "/workspace/tasks" },
        { name: "Calendar", path: "/workspace/calendar" },
      ],
      groups: [],
    },
  },
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
    id: "site-ops",
    name: "Site Operations",
    icon: MapPin,
    path: "/site-ops",
    subModules: [
      { name: "Site Visits", path: "/site-ops/visits" },
      { name: "Measurements", path: "/site-ops/measurements" },
      {
        name: "My Visits",
        path: "/site-ops/my-visits",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      { name: "Field Day", path: "/site-ops/field-day", permission: "field_day.view" },
      { name: "Measurement Reports", path: "/site-ops/reports" },
    ],
    nav: {
      topItems: [{ name: "Home", path: "/site-ops/visits" }],
      groups: [
        {
          label: "Site Operations",
          icon: MapPin,
          items: [
            { name: "Site Visits", path: "/site-ops/visits" },
            { name: "Measurements", path: "/site-ops/measurements" },
            {
              name: "My Visits",
              path: "/site-ops/my-visits",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
            { name: "Today", path: "/site-ops/today" },
            {
              name: "Field Day",
              path: "/site-ops/field-day",
              permission: "field_day.view",
            },
            { name: "Measurement Reports", path: "/site-ops/reports" },
          ],
        },
      ],
    },
  },
  {
    id: "design",
    name: "Design",
    icon: Layers,
    path: "/design",
    subModules: [
      { name: "Design Jobs", path: "/design/jobs", permission: "projects.view" },
      { name: "Measurement Packages", path: "/design/packages" },
      { name: "WINCAD Uploads", path: "/design/uploads" },
      { name: "Design Review", path: "/design/review" },
    ],
    nav: {
      topItems: [{ name: "Home", path: "/design/jobs" }],
      groups: [
        {
          label: "Design",
          icon: Layers,
          items: [
            { name: "Design Jobs", path: "/design/jobs", permission: "projects.view" },
            { name: "Measurement Packages", path: "/design/packages" },
            { name: "WINCAD Uploads", path: "/design/uploads" },
            { name: "Design Review", path: "/design/review" },
          ],
        },
      ],
    },
  },
  {
    id: "quotation",
    name: "Quotation",
    icon: FileText,
    path: "/quotation",
    subModules: [
      { name: "Quotation Requests", path: "/quotation/requests" },
      {
        name: "Proforma Quotations",
        path: "/quotation/proforma",
        permission: "quotations.view",
      },
      { name: "Quotation Review", path: "/quotation/review" },
    ],
    nav: {
      topItems: [{ name: "Home", path: "/quotation/proforma" }],
      groups: [
        {
          label: "Quotation",
          icon: FileText,
          items: [
            { name: "Quotation Requests", path: "/quotation/requests" },
            {
              name: "Proforma Quotations",
              path: "/quotation/proforma",
              permission: "quotations.view",
            },
            { name: "Quotation Review", path: "/quotation/review" },
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
      { name: "Fabrication", path: "/projects/fabrication" },
      { name: "Installation", path: "/projects/installation" },
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
            { name: "Fabrication", path: "/projects/fabrication" },
            { name: "Installation", path: "/projects/installation" },
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
      {
        name: "My Visits",
        path: "/site-ops/my-visits",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      {
        name: "Site Visits Today",
        path: "/site-ops/today",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
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
        {
          label: "Measurements",
          icon: ClipboardList,
          items: [
            {
              name: "My Visits",
              path: "/site-ops/my-visits",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
            {
              name: "Today",
              path: "/site-ops/today",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
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
      { name: "Home", path: "/site-ops/my-visits" },
      {
        name: "Open Deal Visits",
        path: "/field/open-visits",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      {
        name: "Today's Visits",
        path: "/site-ops/today",
        anyPermissions: ["site_visits.execute", "field_installation.log"],
      },
      {
        name: "Site Visits",
        path: "/site-ops/visits",
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
        { name: "Home", path: "/site-ops/my-visits" },
        {
          name: "Open Deal Visits",
          path: "/field/open-visits",
          anyPermissions: ["site_visits.execute", "field_installation.log"],
        },
        {
          name: "Today's Visits",
          path: "/site-ops/today",
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
              path: "/site-ops/today",
              anyPermissions: ["site_visits.execute", "field_installation.log"],
            },
            {
              name: "All Site Visits",
              path: "/site-ops/visits",
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
      { name: "Employees", path: "/hr/employees", permission: "employees.view" },
      { name: "Payroll", path: "/hr/payroll", anyPermissions: ["payroll.manage", "payroll.view", "payroll.approve"] },
      { name: "Leave", path: "/hr/leave", permission: "leave.review" },
      { name: "Documents", path: "/hr/documents", permission: "hr_documents.manage" },
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
            { name: "Employees", path: "/hr/employees", permission: "employees.view" },
            { name: "Payroll", path: "/hr/payroll", anyPermissions: ["payroll.manage", "payroll.view", "payroll.approve"] },
            { name: "Leave", path: "/hr/leave", permission: "leave.review" },
            { name: "Documents", path: "/hr/documents", permission: "hr_documents.manage" },
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
      { name: "Deposit Requests", path: "/finance/deposits" },
      { name: "Receipts", path: "/finance/receipts" },
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
            { name: "Deposit Requests", path: "/finance/deposits" },
            { name: "Receipts", path: "/finance/receipts" },
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
  "/site-ops",
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
    id: "site-ops",
    name: "Site Operations",
    href: "/site-ops/visits",
    icon: MapPin,
    iconClassName: "bg-green-100 text-green-700",
    anyPermissions: [
      "site_visits.view",
      "site_visits.execute",
      "field_day.view",
    ],
  },
  {
    id: "field",
    name: "Field",
    href: "/site-ops/my-visits",
    icon: MapPin,
    iconClassName: "bg-emerald-100 text-emerald-700",
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
    id: "design",
    name: "Design",
    href: "/design/jobs",
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
    id: "quotation",
    name: "Quotation",
    href: "/quotation/proforma",
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
    roles.some((role) =>
      SITE_VISIT_MEASUREMENT_ROLES.includes(
        role as (typeof SITE_VISIT_MEASUREMENT_ROLES)[number],
      ),
    ) &&
    (permission === "site_visits.execute" ||
      anyPermissions?.includes("site_visits.execute") ||
      anyPermissions?.includes("field_installation.log"))
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

/** Self-service leave link shown in every department sidebar footer. */
export const workspaceFooterNavItems = [
  { name: "Leave", href: "/workspace/leave", icon: CalendarDays },
] as const;

export function filterWorkspaceFooterNavItems(): typeof workspaceFooterNavItems {
  return workspaceFooterNavItems;
}

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

function isWorkspaceDepartmentPath(pathname: string): boolean {
  return (
    pathname === "/workspace" ||
    pathname === "/workspace/today" ||
    pathname.startsWith("/workspace/today/") ||
    pathname === "/workspace/tasks" ||
    pathname.startsWith("/workspace/tasks/") ||
    pathname === "/workspace/calendar" ||
    pathname.startsWith("/workspace/calendar/")
  );
}

function isSiteOpsModulePath(pathname: string): boolean {
  return pathname === "/site-ops" || pathname.startsWith("/site-ops/");
}

function isDesignModulePath(pathname: string): boolean {
  return pathname === "/design" || pathname.startsWith("/design/");
}

function isQuotationModulePath(pathname: string): boolean {
  return pathname === "/quotation" || pathname.startsWith("/quotation/");
}

const SLUG_TO_DEPARTMENT_ID: Record<string, string> = {
  workspace: "workspace",
  sales_marketing: "crm",
  site_operations: "site-ops",
  site_ops: "site-ops",
  design: "design",
  quotation: "quotation",
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
    isWorkspaceSelfServicePath(pathname) ||
    pathname === "/workspace/settings" ||
    pathname.startsWith("/workspace/settings/") ||
    pathname === "/workspace/help" ||
    pathname.startsWith("/workspace/help/")
  );
}

export { isWorkspaceSelfServicePath };

export function getActiveDepartment(pathname: string): Department | null {
  if (isWorkspaceDepartmentPath(pathname)) {
    return departments.find((department) => department.id === "workspace") ?? null;
  }

  if (isSiteOpsModulePath(pathname)) {
    return departments.find((department) => department.id === "site-ops") ?? null;
  }

  if (isDesignModulePath(pathname)) {
    return departments.find((department) => department.id === "design") ?? null;
  }

  if (isQuotationModulePath(pathname)) {
    return departments.find((department) => department.id === "quotation") ?? null;
  }

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

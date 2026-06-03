// User & Auth Types
export type UserRole =
  | "super_admin"
  | "operations_manager"
  | "sales_rep"
  | "field_officer"
  | "project_manager"
  | "production_manager"
  | "warehouse_manager_accessories"
  | "warehouse_manager_aluminium"
  | "procurement_officer"
  | "qc_inspector"
  | "hr_manager"
  | "finance_officer"
  | "it_admin"
  | "reception"
  | "client";

export type Department =
  | "sales"
  | "production"
  | "warehouse"
  | "procurement"
  | "qc"
  | "hr"
  | "finance"
  | "it"
  | "project_management"
  | "operations"
  | "reception";

export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: Department;
  jobTitle: string;
  profilePhoto?: string;
  status: UserStatus;
  dateJoined: string;
  lastLogin?: string;
  roles: UserRole[];
}

// CRM Types
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "site_visit_scheduled"
  | "quotation_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "dormant";

export type LeadSource =
  | "field_officer"
  | "walk_in"
  | "phone"
  | "social_media"
  | "website"
  | "referral";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  location?: string;
  notes?: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  convertedFromLead?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  contacts: string[];
  createdAt: string;
}

export type DealStage =
  | "qualification"
  | "needs_analysis"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface Deal {
  id: string;
  name: string;
  contactId: string;
  accountId?: string;
  stage: DealStage;
  value: number;
  currency: string;
  expectedCloseDate: string;
  assignedTo: string;
  probability: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "task" | "site_visit";
  subject: string;
  description?: string;
  relatedTo: { type: "lead" | "contact" | "deal" | "project"; id: string };
  dueDate?: string;
  completedAt?: string;
  assignedTo: string;
  createdAt: string;
}

// Project Types
export type ProjectType = "supply_only" | "fabrication_only" | "full_supply_install";

export type ProjectStage =
  | "awaiting_deposit"
  | "deposit_received"
  | "site_assessment"
  | "design_approval"
  | "bom_finalized"
  | "material_check"
  | "materials_reserved"
  | "awaiting_procurement"
  | "materials_ready"
  | "cutting"
  | "fabrication"
  | "glass_assembly"
  | "qc_pre_installation"
  | "in_transit"
  | "installation"
  | "site_qc"
  | "snagging"
  | "complete";

export type ProjectPriority = "standard" | "urgent" | "apartment_block";

export interface Project {
  id: string;
  name: string;
  clientId: string;
  type: ProjectType;
  location: string;
  isNairobi: boolean;
  stage: ProjectStage;
  priority: ProjectPriority;
  estimatedStartDate: string;
  projectedCompletionDate: string;
  actualCompletionDate?: string;
  overageBuffer: number;
  salesRepId: string;
  projectManagerId: string;
  engineers: string[];
  dealId: string;
  depositAmount: number;
  totalValue: number;
  percentComplete: number;
  createdAt: string;
  updatedAt: string;
}

// Warehouse Types
export type ItemCategory = "aluminium_profile" | "accessory" | "rubber" | "glass";

export interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  category: ItemCategory;
  unit: string;
  minStock: number;
  currentStock: number;
  reservedStock: number;
  location: { warehouse: string; section: string; bin: string };
  dimensions?: { length?: number; width?: number; height?: number };
  weight?: number;
  finish?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: "inbound" | "outbound" | "transfer" | "adjustment";
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  projectId?: string;
  purchaseOrderId?: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

// Procurement Types
export type POStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  specialization: ItemCategory[];
  isPreferred: boolean;
  rating: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: POStatus;
  items: { itemId: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  currency: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  projectId?: string;
  approvedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Production Types (legacy mock shapes — live UI uses @/lib/api/production)
export type ProductionStage =
  | "scheduled"
  | "material_prep"
  | "qc_pre_check"
  | "cutting"
  | "fabrication"
  | "sash_fabrication"
  | "glass_assembly"
  | "final_assembly"
  | "qc_post_fabrication"
  | "ready_for_dispatch";

export interface ProductionOrder {
  id: string;
  projectId: string;
  stage: ProductionStage;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  cuttingTeam: string[];
  fabricationTeam: string[];
  assemblyTeam: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// QC Types
export type QCStage =
  | "pre_production"
  | "post_fabrication"
  | "pre_installation"
  | "site_installation"
  | "snagging_signoff";

export type DefectSeverity = "critical" | "major" | "minor";

export interface QCInspection {
  id: string;
  projectId: string;
  stage: QCStage;
  inspectorId: string;
  checklistItems: {
    item: string;
    passed: boolean;
    notes?: string;
    photoUrl?: string;
  }[];
  overallResult: "pass" | "fail" | "conditional";
  defects: {
    type: string;
    severity: DefectSeverity;
    description: string;
    photoUrl?: string;
    resolved: boolean;
  }[];
  createdAt: string;
}

// HR Types
export interface Employee extends User {
  employeeNumber: string;
  nationalId?: string;
  kraPin?: string;
  nhifNumber?: string;
  nssfNumber?: string;
  contractType: "permanent" | "contract" | "casual";
  contractStart: string;
  contractEnd?: string;
  monthlySalary: number;
  currency: string;
  bankAccount?: string;
  bankName?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    validFrom: string;
    validTo?: string;
  };
  residence?: string;
}

// Finance Types
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  clientId: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAmount: number;
  payments: { amount: number; method: string; date: string; reference?: string }[];
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  projectId?: string;
  purchaseOrderId?: string;
  receipt?: string;
  approvedBy?: string;
  createdBy: string;
  createdAt: string;
}

// Analytics Types
export interface DashboardMetrics {
  activeProjects: number;
  projectsOnTime: number;
  projectsDelayed: number;
  leadsThisMonth: number;
  dealsWonThisMonth: number;
  revenueThisMonth: number;
  outstandingPayments: number;
  lowStockItems: number;
  productionInProgress: number;
  pendingQCInspections: number;
}

// Module Navigation
export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  path: string;
  allowedRoles: UserRole[];
  subModules?: { name: string; path: string; icon: string }[];
}

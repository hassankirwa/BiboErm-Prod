import {
  listPurchaseOrders,
  listRequisitions,
  listSuppliers,
} from "@/lib/api/procurement";

export {
  listSuppliers,
  listPurchaseOrders,
  listRequisitions,
  getProcurementDashboard,
  createRequisition,
  submitRequisition,
  approveRequisition,
} from "@/lib/api/procurement";

export type {
  Supplier,
  PurchaseOrder,
  PurchaseRequisition,
  ProcurementDashboard,
} from "@/lib/api/procurement";

export async function getPurchaseOrders() {
  const res = await listPurchaseOrders({ per_page: 50 });
  return res.data;
}

export async function getSuppliers() {
  const res = await listSuppliers({ per_page: 50 });
  return res.data;
}

export async function getRequisitions() {
  const res = await listRequisitions({ per_page: 50 });
  return res.data;
}

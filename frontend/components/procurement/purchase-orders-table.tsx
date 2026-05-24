"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  CheckCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { mockPurchaseOrders, mockSuppliers } from "@/lib/data/procurement";
import { mockProjects } from "@/lib/data/projects";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  sent: "bg-info/10 text-info",
  partially_received: "bg-chart-4/10 text-chart-4",
  received: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSupplier(supplierId: string) {
  return mockSuppliers.find((s) => s.id === supplierId);
}

function getProject(projectId?: string) {
  if (!projectId) return null;
  return mockProjects.find((p) => p.id === projectId);
}

export function PurchaseOrdersTable() {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>PO Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockPurchaseOrders.map((po) => {
            const supplier = getSupplier(po.supplierId);
            const project = getProject(po.projectId);

            return (
              <TableRow key={po.id} className="group">
                <TableCell>
                  <div>
                    <code className="text-sm font-medium">{po.poNumber}</code>
                    <p className="text-xs text-muted-foreground">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {supplier ? (
                    <div>
                      <p className="text-sm font-medium">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplier.contactPerson}
                      </p>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {project ? (
                    <div>
                      <p className="text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.id}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Stock Order</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{po.items.length} items</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    KES {po.totalAmount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[po.status]}>
                    {formatStatus(po.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit PO
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      {po.status === "approved" && (
                        <DropdownMenuItem>
                          <Send className="mr-2 h-4 w-4" />
                          Send to Supplier
                        </DropdownMenuItem>
                      )}
                      {po.status === "sent" && (
                        <DropdownMenuItem>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Received
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import type { ProductionOrder } from "@/lib/api/production";

type Props = {
  orders: ProductionOrder[];
  showFifo?: boolean;
};

export function ProductionOrdersTable({ orders, showFifo = true }: Props) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production orders in this queue.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showFifo && <TableHead>FIFO</TableHead>}
          <TableHead>Reference</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            {showFifo && <TableCell>{order.fifo_position}</TableCell>}
            <TableCell className="font-medium">{order.reference}</TableCell>
            <TableCell>
              {order.project?.name ?? `Project #${order.project_id}`}
            </TableCell>
            <TableCell>
              <ProductionStageBadge stage={order.current_stage} />
            </TableCell>
            <TableCell className="capitalize">{order.status.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {order.scheduled_start ?? "—"}
            </TableCell>
            <TableCell>
              <Link
                href={`/production/orders/${order.id}`}
                className="text-sm text-primary hover:underline"
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

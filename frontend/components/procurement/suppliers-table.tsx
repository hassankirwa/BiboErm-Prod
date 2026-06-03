"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Supplier } from "@/lib/api/procurement";
import { listSuppliers } from "@/lib/api/procurement";
import { supplierCategoryLabel } from "@/lib/procurement/supplier-categories";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SuppliersTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listSuppliers({ per_page: 50 })
      .then((res) => setSuppliers(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading suppliers…</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Supplier</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(supplier.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.address ?? "—"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-sm">{supplier.code}</code>
              </TableCell>
              <TableCell>{supplierCategoryLabel(supplier.category)}</TableCell>
              <TableCell>
                <div className="text-sm">{supplier.email ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{supplier.phone ?? ""}</div>
              </TableCell>
              <TableCell>
                {supplier.is_preferred ? (
                  <Badge className="bg-success/10 text-success">Preferred</Badge>
                ) : (
                  <Badge variant="secondary">{supplier.is_active ? "Active" : "Inactive"}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

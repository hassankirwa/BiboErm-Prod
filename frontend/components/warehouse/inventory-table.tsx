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
import { Progress } from "@/components/ui/progress";
import type { StockLevel } from "@/lib/api/warehouse";
import {
  MoreHorizontal,
  Eye,
  Edit,
  ArrowRightLeft,
  History,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  aluminium_profile: "Aluminium Profile",
  accessory: "Accessory",
  rubber: "Rubber/Gasket",
};

const categoryColors: Record<string, string> = {
  aluminium_profile: "bg-primary/10 text-primary",
  accessory: "bg-info/10 text-info",
  rubber: "bg-warning/10 text-warning",
};

export function InventoryTable({ items }: { items: StockLevel[] }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Item</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead>Stock Level</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const available = Number(item.quantity_available);
            const current = Number(item.quantity_on_hand);
            const reserved = Number(item.quantity_reserved);
            const minStock = Number(item.item?.min_stock_qty ?? 0);
            const unit = item.item?.unit_of_measure ?? "";
            const isLowStock = available < minStock;
            const stockPercent = Math.min(
              100,
              Math.round((available / Math.max(minStock, 1)) * 100)
            );

            return (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {item.item?.name ?? `Item #${item.item_id}`}
                      {isLowStock && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </p>
                    {item.location?.deck?.name && (
                      <p className="text-xs text-muted-foreground">{item.location.deck.name}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {item.item?.sku ?? `#${item.item_id}`}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={categoryColors[item.item?.category ?? ""] ?? ""}
                  >
                    {categoryLabels[item.item?.category ?? ""] ?? item.item?.category ?? "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="font-medium">{item.location?.section?.code ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {item.bin?.code ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {current.toFixed(3)} {unit}
                </TableCell>
                <TableCell className="text-right text-warning">
                  {reserved.toFixed(3)} {unit}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      isLowStock ? "text-destructive font-medium" : "text-success"
                    }
                  >
                    {available.toFixed(3)} {unit}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="w-24">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Min: {minStock.toFixed(3)}</span>
                      <span
                        className={
                          isLowStock ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {stockPercent}%
                      </span>
                    </div>
                    <Progress
                      value={stockPercent}
                      className={`h-1.5 ${isLowStock ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
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
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transfer Stock
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <History className="mr-2 h-4 w-4" />
                        Movement History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                No inventory records found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

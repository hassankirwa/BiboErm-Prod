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
import {
  MoreHorizontal,
  Eye,
  Edit,
  ArrowRightLeft,
  History,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { mockWarehouseItems } from "@/lib/data/warehouse";

const categoryLabels: Record<string, string> = {
  aluminium_profile: "Aluminium Profile",
  accessory: "Accessory",
  rubber: "Rubber/Gasket",
  glass: "Glass",
};

const categoryColors: Record<string, string> = {
  aluminium_profile: "bg-primary/10 text-primary",
  accessory: "bg-info/10 text-info",
  rubber: "bg-warning/10 text-warning",
  glass: "bg-chart-5/10 text-chart-5",
};

export function InventoryTable() {
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
          {mockWarehouseItems.map((item) => {
            const available = item.currentStock - item.reservedStock;
            const isLowStock = available < item.minStock;
            const stockPercent = Math.min(
              100,
              Math.round((available / item.minStock) * 100)
            );

            return (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {item.name}
                      {isLowStock && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </p>
                    {item.finish && (
                      <p className="text-xs text-muted-foreground">{item.finish}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {item.code}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={categoryColors[item.category]}
                  >
                    {categoryLabels[item.category]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="font-medium">{item.location.section}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {item.location.bin}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.currentStock} {item.unit}
                </TableCell>
                <TableCell className="text-right text-warning">
                  {item.reservedStock} {item.unit}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      isLowStock ? "text-destructive font-medium" : "text-success"
                    }
                  >
                    {available} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="w-24">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Min: {item.minStock}</span>
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
        </TableBody>
      </Table>
    </div>
  );
}

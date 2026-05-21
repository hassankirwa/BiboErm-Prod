import { Card, CardContent } from "@/components/ui/card";
import { crmHomeStats } from "@/lib/crm-home-data";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrmHomeStats() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {crmHomeStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="min-w-0 rounded-[10px] border-border/70 bg-card shadow-sm"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
                  stat.iconClassName
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold leading-none text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                  <TrendingUp className="h-3 w-3 shrink-0" />
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

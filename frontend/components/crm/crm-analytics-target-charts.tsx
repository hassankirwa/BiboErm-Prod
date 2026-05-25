"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function ChartCardMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Export</DropdownMenuItem>
        <DropdownMenuItem>Refresh</DropdownMenuItem>
        <DropdownMenuItem>Configure</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChartCardShell({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden rounded-[10px] border-border/80 bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pb-1 pt-4">
        <h3 className="text-[11px] font-bold uppercase leading-snug tracking-wide text-foreground">
          {title}
        </h3>
        <ChartCardMenu />
      </div>
      {children}
    </Card>
  );
}

export function LeadGenerationTargetChart({
  current = 350,
  target = 1000,
}: {
  current?: number;
  target?: number;
}) {
  const pct = Math.round((current / target) * 100);
  const remaining = target - current;
  const radius = 90;
  const stroke = 16;
  const cx = 110;
  const cy = 105;
  const arcLen = Math.PI * radius;
  const dash = (pct / 100) * arcLen;

  return (
    <ChartCardShell title="Lead Generation Target — This Year">
      <div className="flex flex-col items-center px-4 pb-5 pt-1">
        <svg
          viewBox="0 0 220 130"
          className="h-[150px] w-full max-w-[320px]"
          aria-label={`Lead generation ${pct}% of target`}
        >
          {/* Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#e8e8e8"
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
          {/* Progress */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#ec2024"
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${arcLen}`}
          />
          {/* Center value */}
          <text
            x={cx}
            y={cy - 14}
            textAnchor="middle"
            className="fill-foreground"
            fontSize="28"
            fontWeight="700"
          >
            {current}
          </text>
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize="13"
          >
            ({pct}%)
          </text>
          {/* Axis: 0 */}
          <text
            x={cx - radius - 2}
            y={cy + 22}
            textAnchor="middle"
            className="fill-neutral-600"
            fontSize="12"
            fontWeight="500"
          >
            0
          </text>
          {/* Axis: target */}
          <text
            x={cx + radius + 2}
            y={cy + 16}
            textAnchor="middle"
            className="fill-neutral-600"
            fontSize="12"
            fontWeight="500"
          >
            {target.toLocaleString()}
          </text>
          <text
            x={cx + radius + 2}
            y={cy + 30}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize="11"
          >
            Target
          </text>
        </svg>
        <p className="-mt-1 text-center text-sm text-neutral-600">
          Remaining: <span className="font-semibold text-foreground">{remaining}</span>
        </p>
      </div>
    </ChartCardShell>
  );
}

const REVENUE_ACHIEVED = 420_000;
const REVENUE_TARGET = 1_000_000;
const REVENUE_MAX_SCALE = 1_200_000;

const xAxisTicks = [
  { label: "0", value: 0 },
  { label: "200K", value: 200_000 },
  { label: "400K", value: 400_000 },
  { label: "600K", value: 600_000 },
  { label: "800K", value: 800_000 },
  { label: "1M", value: 1_000_000 },
  { label: "1.2M", value: 1_200_000 },
];

function scalePct(value: number) {
  return `${(value / REVENUE_MAX_SCALE) * 100}%`;
}

export function RevenueTargetChart({
  achieved = REVENUE_ACHIEVED,
  target = REVENUE_TARGET,
}: {
  achieved?: number;
  target?: number;
}) {
  const achievedPct = target > 0 ? Math.round((achieved / target) * 100) : 0;
  const achievedWidth = scalePct(achieved);
  const targetLineLeft = scalePct(target);

  return (
    <ChartCardShell title="Revenue Target — This Year">
      <div className="px-3 pb-4 pt-1 sm:px-4">
        <div className="flex gap-2 sm:gap-3">
          {/* Y-axis */}
          <div className="flex w-14 shrink-0 items-center justify-end pr-1 sm:w-16">
            <span className="text-[10px] font-medium text-neutral-600 sm:text-xs">
              Entire Org
            </span>
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto">
            {/* Target label above bar */}
            <div className="relative mb-1 h-8">
              <div
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center whitespace-nowrap"
                style={{ left: targetLineLeft }}
              >
                <span className="text-[10px] font-medium text-foreground sm:text-xs">
                  Target: KES {target.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bar + target line */}
            <div className="relative">
              <div className="relative flex h-9 w-full min-h-9 overflow-hidden rounded-sm border border-neutral-200/80 bg-neutral-100 sm:h-10">
                <div
                  className="relative shrink-0 bg-[#ec2024]"
                  style={{ width: achievedWidth }}
                >
                  <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[8px] font-semibold leading-tight text-white sm:text-[10px]">
                    KES{" "}
                    {achieved.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ({achievedPct}%)
                  </span>
                </div>
                <div className="min-w-0 flex-1 bg-neutral-200" />
              </div>
              {/* Dashed target line */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-0 border-l-2 border-dashed border-neutral-800"
                style={{ left: targetLineLeft }}
                aria-hidden
              />
            </div>

            {/* X-axis ticks */}
            <div className="relative mt-1 h-5 w-full border-t border-neutral-300">
              {xAxisTicks.map((tick) => (
                <span
                  key={tick.label}
                  className="absolute top-1 -translate-x-1/2 text-[9px] text-neutral-500 sm:text-[10px]"
                  style={{ left: scalePct(tick.value) }}
                >
                  {tick.label}
                </span>
              ))}
            </div>

            {/* X-axis title */}
            <p className="mt-0.5 text-center text-[10px] text-neutral-500 sm:text-xs">
              Sum of Amount (KES)
            </p>

            {/* Target label below axis */}
            <div className="relative mt-2 h-10">
              <div
                className="absolute flex -translate-x-1/2 flex-col items-center text-center"
                style={{ left: targetLineLeft }}
              >
                <span className="text-[10px] font-medium text-neutral-700 sm:text-xs">
                  Target
                </span>
                <span className="text-[10px] text-neutral-600 sm:text-xs">
                  KES {target.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#ec2024]" />
                <span className="text-[11px] text-neutral-600">Achieved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neutral-200" />
                <span className="text-[11px] text-neutral-600">Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChartCardShell>
  );
}

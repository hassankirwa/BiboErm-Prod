"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LeadViewMode } from "@/lib/leads-list-data";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  getDueDateTone,
  dueDateToneBgClasses,
} from "@/lib/activity-due-date";
import {
  CalendarViewMode,
  HOUR_SLOTS,
  WEEKDAY_LABELS,
  eventTypeStyles,
  type LeadCalendarEvent,
} from "@/lib/leads-calendar-data";
import {
  apiCardsToCalendarEvents,
  crmCalendarEventsToLeadEvents,
} from "@/lib/crm-lead-mapper";
import { fetchCrmCalendarEvents } from "@/lib/api/crm/calendar";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";

const weekOpts = { weekStartsOn: 1 as const };

function parseEventDate(iso: string): Date {
  return parseISO(`${iso}T12:00:00`);
}

function eventsOnDay(events: LeadCalendarEvent[], day: Date): LeadCalendarEvent[] {
  return events
    .filter((e) => isSameDay(parseEventDate(e.date), day))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function CalendarEventChip({
  event,
  returnView,
  compact = false,
}: {
  event: LeadCalendarEvent;
  returnView: LeadViewMode;
  compact?: boolean;
}) {
  const tone = getDueDateTone(parseEventDate(event.date));
  const styles = eventTypeStyles[event.type];

  const href =
    event.href ??
    (event.leadId
      ? `/crm/leads/${event.leadId}?view=${returnView}`
      : `/crm/leads?view=${returnView}`);

  return (
    <Link
      href={href}
      className={cn(
        "block rounded border px-1.5 py-1 text-left transition-colors hover:opacity-90",
        styles.bg,
        styles.border,
        compact ? "text-[10px] leading-tight" : "text-xs"
      )}
    >
      <div className="flex items-center gap-1">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
        {!compact && (
          <span className="text-[10px] text-muted-foreground">{event.startTime}</span>
        )}
      </div>
      <p className={cn("font-medium text-[#1e3a5f]", compact && "truncate")}>
        {event.title}
      </p>
      {!compact && (
        <p className="truncate text-muted-foreground">{event.subtitle}</p>
      )}
      <span
        className={cn(
          "mt-0.5 inline-block rounded px-1 text-[9px] font-medium",
          dueDateToneBgClasses(tone)
        )}
      >
        {event.owner.split(" ")[0]}
      </span>
    </Link>
  );
}

export function LeadsCalendarView({
  returnView = "calendar",
  cards,
}: {
  returnView?: LeadViewMode;
  cards?: LeadKanbanCard[];
}) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [apiEvents, setApiEvents] = useState<LeadCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const range = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gridStart = startOfWeek(monthStart, weekOpts);
      const gridEnd = endOfWeek(monthEnd, weekOpts);
      return { from: format(gridStart, "yyyy-MM-dd"), to: format(gridEnd, "yyyy-MM-dd") };
    }
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, weekOpts);
      const end = endOfWeek(currentDate, weekOpts);
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    }
    return {
      from: format(currentDate, "yyyy-MM-dd"),
      to: format(currentDate, "yyyy-MM-dd"),
    };
  }, [viewMode, currentDate]);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    fetchCrmCalendarEvents(range)
      .then((res) => {
        if (!cancelled) {
          setApiEvents(crmCalendarEventsToLeadEvents(res.data ?? []));
        }
      })
      .catch(() => {
        if (!cancelled) setApiEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const followUpEvents = useMemo(
    () => (cards ? apiCardsToCalendarEvents(cards) : []),
    [cards],
  );

  const events = useMemo(() => {
    const merged = new Map<string, LeadCalendarEvent>();
    for (const event of [...apiEvents, ...followUpEvents]) {
      merged.set(event.id, event);
    }
    return Array.from(merged.values());
  }, [apiEvents, followUpEvents]);

  const showEmptyHint = !loadingEvents && events.length === 0;

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (viewMode === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };
  const goNext = () => {
    if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, weekOpts);
      const end = endOfWeek(currentDate, weekOpts);
      return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }
    return format(currentDate, "EEEE, d MMMM yyyy");
  }, [viewMode, currentDate]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, weekOpts);
    const gridEnd = endOfWeek(monthEnd, weekOpts);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, weekOpts);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const dayEvents = useMemo(
    () => eventsOnDay(events, currentDate),
    [currentDate]
  );

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card">
      {showEmptyHint && (
        <div className="border-b border-border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
          No lead activities to show. Load leads from the API or switch to another view.
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs sm:text-sm"
            onClick={goToday}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goNext}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="min-w-0 truncate pl-1 text-sm font-semibold text-[#1e3a5f] sm:text-base">
            {headerLabel}
          </h2>
        </div>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as CalendarViewMode)}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <ToggleGroupItem value="day" className="flex-1 px-3 sm:flex-none">
            Day
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="flex-1 px-3 sm:flex-none">
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="month" className="flex-1 px-3 sm:flex-none">
            Month
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Month view */}
      {viewMode === "month" && (
        <div className="overflow-x-auto p-2 sm:p-4">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-xs font-semibold text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const dayEv = eventsOnDay(events, day);
                const inMonth = isSameMonth(day, currentDate);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[88px] border-b border-r border-border p-1 sm:min-h-[100px] sm:p-1.5",
                      !inMonth && "bg-muted/30",
                      today && "bg-primary/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode("day");
                      }}
                      className={cn(
                        "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7",
                        today && "bg-primary text-primary-foreground",
                        !today && inMonth && "text-foreground hover:bg-muted",
                        !inMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                    <div className="space-y-0.5">
                      {dayEv.slice(0, 2).map((ev) => (
                        <CalendarEventChip key={ev.id} event={ev} returnView={returnView} compact />
                      ))}
                      {dayEv.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode("day");
                          }}
                          className="w-full text-left text-[10px] font-medium text-primary hover:underline"
                        >
                          +{dayEv.length - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Week view */}
      {viewMode === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => {
                const today = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode("day");
                    }}
                    className={cn(
                      "border-r border-border py-3 text-center last:border-r-0",
                      today && "bg-primary/5"
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      {format(day, "EEE")}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-lg font-semibold",
                        today ? "text-primary" : "text-[#1e3a5f]"
                      )}
                    >
                      {format(day, "d")}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-7 min-h-[320px]">
              {weekDays.map((day) => {
                const dayEv = eventsOnDay(events, day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "space-y-1.5 border-r border-border p-1.5 last:border-r-0 sm:p-2",
                      today && "bg-primary/5"
                    )}
                  >
                    {dayEv.length === 0 ? (
                      <p className="py-4 text-center text-[10px] text-muted-foreground">
                        —
                      </p>
                    ) : (
                      dayEv.map((ev) => (
                        <CalendarEventChip key={ev.id} event={ev} returnView={returnView} />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day view */}
      {viewMode === "day" && (
        <div className="flex min-h-[360px] flex-col sm:flex-row">
          <div className="border-b border-border p-4 sm:w-48 sm:border-b-0 sm:border-r">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {format(currentDate, "EEEE")}
            </p>
            <p className="text-2xl font-semibold text-[#1e3a5f]">
              {format(currentDate, "d")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, "MMMM yyyy")}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto p-3 sm:p-4">
            <div className="relative min-w-[280px]">
              {HOUR_SLOTS.map((hour) => {
                const slotEvents = dayEvents.filter((e) => {
                  const h = parseInt(e.startTime.split(":")[0], 10);
                  const slotH = parseInt(hour.split(":")[0], 10);
                  return h === slotH;
                });

                return (
                  <div
                    key={hour}
                    className="grid grid-cols-[52px_1fr] border-t border-border/80 first:border-t-0"
                  >
                    <span className="py-3 pr-2 text-right text-xs text-muted-foreground">
                      {hour}
                    </span>
                    <div className="min-h-[52px] space-y-1.5 border-l border-border/80 py-1.5 pl-3">
                      {slotEvents.map((ev) => (
                        <CalendarEventChip key={ev.id} event={ev} returnView={returnView} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {dayEvents.filter((e) => {
                const h = parseInt(e.startTime.split(":")[0], 10);
                return !HOUR_SLOTS.some(
                  (slot) => parseInt(slot.split(":")[0], 10) === h
                );
              }).map((ev) => (
                <div
                  key={ev.id}
                  className="mt-2 grid grid-cols-[52px_1fr] border-t border-border/80"
                >
                  <span className="py-2 pr-2 text-right text-xs text-muted-foreground">
                    {ev.startTime}
                  </span>
                  <div className="border-l border-border/80 py-2 pl-3">
                    <CalendarEventChip event={ev} returnView={returnView} />
                  </div>
                </div>
              ))}
              {dayEvents.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No activities scheduled for this day.
                </p>
              )}
            </div>
          </div>

          {dayEvents.length > 0 && (
            <div className="border-t border-border bg-muted/20 p-4 lg:hidden">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                All activities
              </p>
              <ul className="space-y-2">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>
                    <CalendarEventChip event={ev} returnView={returnView} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dayEvents.length > 0 && (
            <div className="hidden border-t border-border bg-muted/20 p-4 lg:block lg:w-56 lg:border-t-0 lg:border-l">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                All activities
              </p>
              <ul className="space-y-2">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>
                    <CalendarEventChip event={ev} returnView={returnView} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2.5 text-xs text-muted-foreground sm:px-4">
        <span className="font-medium text-foreground">Legend:</span>
        {(
          Object.entries(eventTypeStyles) as [
            keyof typeof eventTypeStyles,
            (typeof eventTypeStyles)["site_visit"],
          ][]
        ).map(([type, style]) => (
          <span key={type} className="flex items-center gap-1.5 capitalize">
            <span className={cn("h-2 w-2 rounded-full", style.dot)} />
            {type.replace("_", " ")}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">
          Due:{" "}
          <span className="text-green-600">upcoming</span> ·{" "}
          <span className="text-orange-600">today</span> ·{" "}
          <span className="text-red-600">overdue</span>
        </span>
      </div>
    </div>
  );
}

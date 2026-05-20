export type DueDateTone = "green" | "orange" | "red";

export function getDueDateTone(date: Date, today = new Date()): DueDateTone {
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const due = startOf(date);
  const now = startOf(today);
  if (due < now) return "red";
  if (due === now) return "orange";
  return "green";
}

export function dueDateToneClasses(tone: DueDateTone): string {
  switch (tone) {
    case "green":
      return "text-green-600";
    case "orange":
      return "text-orange-600";
    case "red":
      return "text-red-600";
  }
}

export function dueDateToneBgClasses(tone: DueDateTone): string {
  switch (tone) {
    case "green":
      return "bg-green-100 text-green-700";
    case "orange":
      return "bg-orange-100 text-orange-700";
    case "red":
      return "bg-red-100 text-red-700";
  }
}

export function formatDisplayDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

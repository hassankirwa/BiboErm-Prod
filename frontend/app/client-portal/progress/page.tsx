"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClientPortalGallery } from "@/components/client-portal/gallery";
import { ClientPortalJourneyStepper } from "@/components/client-portal/journey-stepper";
import { Button } from "@/components/ui/button";
import {
  getClientPortalProgress,
  type ClientPortalProgress,
} from "@/lib/api/client-portal";
import { cn } from "@/lib/utils";

function pretty(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ClientPortalProgressContent() {
  const params = useSearchParams();
  const [data, setData] = useState<ClientPortalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = useMemo(() => {
    const fromQuery = Number(params.get("project"));
    if (Number.isFinite(fromQuery) && fromQuery > 0) return fromQuery;
    if (typeof window !== "undefined") {
      return Number(window.localStorage.getItem("bibo_client_portal_project_id"));
    }
    return 0;
  }, [params]);

  useEffect(() => {
    const token = window.localStorage.getItem("bibo_client_portal_token");
    if (!projectId || !token) {
      setError("Open the portal again with your project number and phone.");
      setLoading(false);
      return;
    }

    getClientPortalProgress(projectId, token)
      .then((response) => setData(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load progress."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#737373]">
        Loading project progress...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-white px-6">
        <p className="mb-4 text-sm text-[#ec2024]">{error ?? "Project not found."}</p>
        <Button asChild className="w-fit bg-[#ec2024] hover:bg-[#d41c20]">
          <Link href="/client-portal">Open portal</Link>
        </Button>
      </main>
    );
  }

  const journey = data.journey?.length
    ? data.journey
    : [
        { key: "design", number: 1, label: "Design", description: "", state: "upcoming" as const },
        { key: "production", number: 2, label: "Production", description: "", state: "upcoming" as const },
        { key: "installation", number: 3, label: "Installation", description: "", state: "upcoming" as const },
        { key: "complete", number: 4, label: "Complete", description: "", state: "upcoming" as const },
      ];

  const currentStep = journey.find((step) => step.state === "current") ?? journey[journey.length - 1];
  const gallery = data.gallery ?? [];
  const installationPhotos = gallery.filter((item) => item.step === "installation");
  const timelineRange = [
    formatDate(data.project.projected_start) ?? "Start pending",
    formatDate(data.project.projected_end) ?? "completion pending",
  ].join(" → ");

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="border-b border-[#e5e5e5] bg-[#fff5f5]">
        <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-8 sm:px-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#ec2024]">
                Bibo client portal
              </p>
              <p className="mt-3 text-sm text-[#737373]">{data.project.reference}</p>
              <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
                {data.project.name}
              </h1>
              <p className="mt-3 text-sm text-[#737373]">
                Current stage: <span className="font-medium text-black">{data.project.stage_label}</span>
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-[#e5e5e5] bg-white text-black hover:border-[#ec2024]/40 hover:bg-white hover:text-black"
            >
              <Link href="/client-portal">Switch project</Link>
            </Button>
          </div>

          <div className="mb-8 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-8 sm:px-8">
            <ClientPortalJourneyStepper steps={journey} />
            <div className="mx-auto mt-8 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs text-[#737373]">
                <span>{currentStep?.label ?? data.project.stage_label}</span>
                <span>{data.project.completion_percent}% complete</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#f5f5f5]">
                <div
                  className="h-full rounded-full bg-[#ec2024] transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, Number(data.project.completion_percent) || 0))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="Site" value={data.project.site_address ?? "Site address pending"} />
            <InfoTile label="Timeline" value={timelineRange} />
            <InfoTile
              label="Project manager"
              value={data.project.project_manager?.name ?? "To be assigned"}
              hint={data.project.project_manager?.email}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-10 sm:px-8">
        <section className="space-y-4">
          <SectionHeading
            title="Photos from your project"
            subtitle="Site visits, quality checks, and installation progress shared by the team."
          />
          <ClientPortalGallery items={gallery} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Production">
            {data.production.length ? (
              <div className="space-y-3">
                {data.production.map((order) => (
                  <div key={order.id} className="border-b border-[#e5e5e5] pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-black">{order.reference}</p>
                    <p className="mt-1 text-sm text-[#737373]">
                      {order.current_stage_label ?? pretty(String(order.current_stage ?? "—"))}
                      {" · "}
                      <span className="capitalize">{pretty(String(order.status))}</span>
                    </p>
                    {(order.scheduled_start || order.scheduled_end) && (
                      <p className="mt-1 text-xs text-[#a3a3a3]">
                        Scheduled {formatDate(order.scheduled_start) ?? "—"} to{" "}
                        {formatDate(order.scheduled_end) ?? "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Production has not started yet.</Empty>
            )}
          </Panel>

          <Panel title="Installation">
            {data.installation.length ? (
              <div className="space-y-5">
                {data.installation.map((job) => (
                  <div key={job.id} className="space-y-3 border-b border-[#e5e5e5] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-black">{job.reference}</p>
                        <p className="mt-1 text-sm capitalize text-[#737373]">{pretty(job.status)}</p>
                      </div>
                      <span className="rounded-full bg-[#ec2024]/10 px-2.5 py-1 text-xs font-medium text-[#ec2024]">
                        {job.percent_complete}%
                      </span>
                    </div>

                    {job.units.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {job.units.map((unit) => (
                          <span
                            key={unit.id}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px]",
                              String(unit.status).includes("install") || unit.installed_at
                                ? "border-[#ec2024]/30 bg-[#ec2024]/10 text-[#ec2024]"
                                : "border-[#e5e5e5] bg-[#fafafa] text-[#737373]",
                            )}
                          >
                            {unit.label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {job.latest_logs.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#a3a3a3]">
                          Recent site updates
                        </p>
                        {job.latest_logs.slice(0, 4).map((log) => (
                          <p key={log.id} className="text-sm text-[#525252]">
                            <span className="text-[#a3a3a3]">{formatDate(log.log_date) ?? "—"}: </span>
                            {log.summary}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {installationPhotos.length > 0 ? (
                  <p className="text-xs text-[#a3a3a3]">
                    {installationPhotos.length} installation photo
                    {installationPhotos.length === 1 ? "" : "s"} in the gallery above.
                  </p>
                ) : null}
              </div>
            ) : (
              <Empty>Installation is not scheduled yet.</Empty>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Quality checks">
            {data.qc.length ? (
              <div className="space-y-3">
                {data.qc.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-black">{inspection.reference}</p>
                      <p className="mt-1 text-sm capitalize text-[#737373]">
                        {pretty(inspection.context)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#ec2024]/10 px-2.5 py-1 text-xs capitalize text-[#ec2024]">
                      {pretty(inspection.result)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No published quality checks yet.</Empty>
            )}
          </Panel>

          <Panel title="Your documents">
            {data.documents.length ? (
              <div className="space-y-2">
                {data.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-sm transition hover:border-[#ec2024]/40"
                  >
                    <span className="truncate text-black">{document.filename}</span>
                    <span className="shrink-0 text-xs capitalize text-[#737373]">
                      {pretty(document.type)}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty>No client documents are available yet.</Empty>
            )}
          </Panel>
        </section>

        {data.timeline.length > 0 ? (
          <section className="space-y-4">
            <SectionHeading title="Recent activity" subtitle="Latest stage movements on your project." />
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
              {data.timeline.slice(0, 8).map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm",
                    index > 0 && "border-t border-[#e5e5e5]",
                  )}
                >
                  <p className="text-black">{entry.to_stage_label}</p>
                  <p className="text-xs text-[#a3a3a3]">{formatDate(entry.changed_at) ?? "—"}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {data.delays.length > 0 ? (
          <section className="space-y-4">
            <SectionHeading title="Schedule notes" subtitle="Delays recorded for transparency." />
            <div className="space-y-2">
              {data.delays.map((delay) => (
                <div
                  key={delay.id}
                  className="rounded-xl border border-[#ec2024]/20 bg-[#fff5f5] px-4 py-3 text-sm"
                >
                  <p className="font-medium text-[#ec2024]">{delay.stage_label}</p>
                  <p className="mt-1 text-[#525252]">{delay.reason}</p>
                  {delay.days_lost != null ? (
                    <p className="mt-1 text-xs text-[#a3a3a3]">{delay.days_lost} day(s) affected</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-normal text-black">{title}</h2>
      <p className="mt-1 text-sm text-[#737373]">{subtitle}</p>
    </div>
  );
}

function InfoTile({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#ec2024]">{label}</p>
      <p className="mt-2 text-sm text-black">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#737373]">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5">
      <h2 className="mb-4 text-base font-semibold tracking-normal text-black">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[#737373]">{children}</p>;
}

export default function ClientPortalProgressPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#737373]">
          Loading project progress...
        </main>
      }
    >
      <ClientPortalProgressContent />
    </Suspense>
  );
}

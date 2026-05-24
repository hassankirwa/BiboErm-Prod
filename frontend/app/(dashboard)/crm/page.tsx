import { CrmPageBackground } from "@/components/crm/crm-page-background";
import { CrmHomeStats } from "@/components/crm/crm-home-stats";
import { CrmHomeTables } from "@/components/crm/crm-home-tables";

export default function CrmHomePage() {
  return (
    <div className="relative w-full min-w-0 bg-[#f0f0f0]">
      <div className="relative w-full min-h-full min-w-0">
        <CrmPageBackground />

        <div className="relative z-10 w-full min-w-0">
          <div className="w-full min-w-0 space-y-4 px-3 py-4 pb-6 sm:space-y-5 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Welcome, Sales Team 👋
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Here&apos;s a quick overview of your CRM activity today.
              </p>
            </div>

            <CrmHomeStats />
            <CrmHomeTables />
          </div>
        </div>
      </div>
    </div>
  );
}

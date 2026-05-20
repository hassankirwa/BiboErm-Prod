"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadComposeEmail } from "@/components/crm/lead-compose-email";
import { useLeadById } from "@/lib/leads-state";

function LeadEmailPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leadId = params.id as string;
  const view = searchParams.get("view");
  const lead = useLeadById(leadId);

  if (!lead) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Lead not found.{" "}
        <Button variant="link" asChild>
          <Link href="/crm/leads?view=list">Back to leads</Link>
        </Button>
      </div>
    );
  }

  return (
    <LeadComposeEmail
      lead={lead}
      leadId={leadId}
      returnView={view}
      variant="page"
    />
  );
}

export default function LeadEmailPage() {
  return (
    <CrmPageShell>
      <CrmPageContent className="!p-0 sm:!p-0 md:!p-0 lg:!p-0">
        <Suspense fallback={null}>
          <LeadEmailPageInner />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}

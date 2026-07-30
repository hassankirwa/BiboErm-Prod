"use client";

import { Suspense } from "react";
import { CrmActivitiesHub } from "@/components/crm/crm-activities-hub";
import { Spinner } from "@/components/ui/spinner";

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      }
    >
      <CrmActivitiesHub />
    </Suspense>
  );
}

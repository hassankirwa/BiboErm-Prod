"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";
import { ChevronLeft } from "lucide-react";

export default function NewCrmProjectPage() {
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get("account_id");
  const accountNameParam = searchParams.get("account_name");
  const dealIdParam = searchParams.get("deal_id");
  const dealLabelParam = searchParams.get("deal_label");

  const defaultAccountId = accountIdParam ? Number(accountIdParam) : null;
  const defaultDealId = dealIdParam ? Number(dealIdParam) : null;

  return (
    <>
      <AppHeader
        title="Create Project"
        subtitle="Enter project details — the project will appear in the pipeline after creation"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/projects">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <div className="mx-auto w-full max-w-3xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Project information</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectForm
                defaultAccountId={
                  defaultAccountId && Number.isFinite(defaultAccountId)
                    ? defaultAccountId
                    : null
                }
                defaultAccountName={accountNameParam}
                defaultDealId={
                  defaultDealId && Number.isFinite(defaultDealId) ? defaultDealId : null
                }
                defaultDealLabel={dealLabelParam}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

import { redirect } from "next/navigation";

export default function HrOnboardingRedirectPage() {
  redirect("/hr/employees?status=pending_hr_review");
}

"use client";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";

export default function DirectorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const skipHeader =
    pathname === "/director/appraisal" ||
    pathname.startsWith("/director/interaction-evaluation") ||
    (pathname.startsWith("/director/sent-appraisals/") && pathname !== "/director/sent-appraisals");

  const header = useMemo(() => {
    switch (true) {
      case pathname === "/director/dashboard":
        return { title: "Director Dashboard", description: "Overview of all faculty appraisals and institutional management" };
      case pathname === "/director/hod-forms":
        return { title: "HOD Appraisals", description: "View and verify appraisal submissions from HODs" };
      case pathname === "/director/dean-forms":
        return { title: "Dean Appraisals", description: "View and verify appraisal submissions from Deans" };
      case pathname === "/director/faculty-forms":
        return { title: "Faculty Appraisals", description: "View faculty appraisals sent for director review" };
      case pathname === "/director/add-external":
        return { title: "Add External Reviewer", description: "Register external reviewers for faculty interaction evaluation" };
      case pathname === "/director/assign-external":
        return { title: "Assign External Reviewer", description: "Assign external reviewers to faculty for interaction evaluation" };
      case pathname === "/director/director-verify":
        return { title: "Director Verification", description: "Verify portfolio marks and finalize appraisal" };
      case pathname === "/director/sent-appraisals":
        return { title: "Sent Appraisals", description: "View appraisals sent by HODs for director review" };
      default:
        return { title: "Director Dashboard", description: "Overview of all faculty appraisals and institutional management" };
    }
  }, [pathname]);

  if (skipHeader) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <DashboardHeader title={header.title} description={header.description} />
      {children}
    </div>
  );
}

"use client";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";

export default function VerificationTeamLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const skipHeader = pathname.startsWith("/verification-team/verification-form");

  const header = useMemo(() => {
    if (pathname === "/verification-team/dashboard") {
      return { title: "Verification Team Dashboard", description: "" };
    }
    return { title: "Verification Team", description: "Research verification portal" };
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

"use client";

import { useCallback, useState } from "react";
import Dashboard from "@/components/dashboard";
import { useAuth } from "@/app/AuthProvider";
import {
  User,
  BookOpen,
  FileText,
  Building2,
  FileDown,
  CheckSquare,
} from "lucide-react";

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAppraisal = useCallback(async () => {
    if (!user?.id) return;

    setIsDownloading(true);
    try {
      const filename = encodeURIComponent(`${user.name || `appraisal-${user.id}`}.pdf`);
      window.open(
        `/api/appraisal/${user.id}/pdf/${filename}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error("[DownloadAppraisal]", err);
    } finally {
      setIsDownloading(false);
    }
  }, [user]);

  return (
    <>
      <Dashboard
        quickLinks={[
          {
            href: "/faculty/appraisal?tab=A",
            icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
            label: "Teaching & Academic",
            description: "Part A - Academic Involvement",
          },
          {
            href: "/faculty/appraisal?tab=B",
            icon: <FileText className="w-6 h-6 text-indigo-600" />,
            label: "Research (Part B)",
            description: "Track your research work",
          },
          {
            href: "/faculty/appraisal?tab=C",
            icon: <Building2 className="w-6 h-6 text-indigo-600" />,
            label: "Self Development",
            description: "Part C - Self Development",
          },
          {
            href: "/faculty/appraisal?tab=D",
            icon: <User className="w-6 h-6 text-indigo-600" />,
            label: "Portfolio (Part D)",
            description: "Manage your portfolio items",
          },
          {
            onClick: handleDownloadAppraisal,
            icon: (
              <FileDown
                className={`w-6 h-6 text-indigo-600 ${isDownloading ? "animate-bounce" : ""}`}
              />
            ),
            label: isDownloading ? "Opening…" : "Open Appraisal PDF",
            description: "Open your appraisal in the browser PDF viewer",
          },
          {
            href: "/faculty/appraisal?tab=F",
            icon: <CheckSquare className="w-6 h-6 text-indigo-600" />,
            label: "Review & Submit",
            description: "Complete your evaluation",
          },
        ]}
        showWelcomeInfo={true}
      />
    </>
  );
}


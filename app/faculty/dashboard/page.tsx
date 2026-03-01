"use client";

import { useState } from "react";
import Dashboard from "@/components/dashboard";
import { useAuth } from "@/app/AuthProvider";
import { tokenManager } from "@/lib/api-client";
import { User, BookOpen, FileText, Building2, FileDown, CheckSquare } from "lucide-react";

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!user?.id || downloading) return;
    setDownloading(true);
    try {
      const token = tokenManager.getToken();
      const res = await fetch(`/api/appraisal/${user.id}/pdf`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `appraisal-${user.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dashboard
      userName="Faculty"
      quickLinks={[
        {
          href: "/faculty/profile",
          icon: <User className="w-6 h-6 text-indigo-600" />,
          label: "Profile",
          description: "View and update your profile",
        },
        {
          href: "/faculty/teaching",
          icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
          label: "Teaching Performance",
          description: "Manage your teaching activities",
        },
        {
          href: "/faculty/research",
          icon: <FileText className="w-6 h-6 text-indigo-600" />,
          label: "Research",
          description: "Track your research work",
        },
        {
          href: "/faculty/self-development",
          icon: <Building2 className="w-6 h-6 text-indigo-600" />,
          label: "Self Development",
          description: "Monitor your personal growth",
        },
        {
          onClick: handleDownloadPDF,
          loading: downloading,
          disabled: downloading || !user,
          icon: <FileDown className="w-6 h-6 text-indigo-600" />,
          label: "Download Appraisal",
          description: "Download your appraisal as PDF",
        },
        {
          href: "/faculty/review",
          icon: <CheckSquare className="w-6 h-6 text-indigo-600" />,
          label: "Review",
          description: "Complete your evaluation",
        },
      ]}
      showWelcomeInfo={true}
    />
  );
}

"use client";

import { useCallback, useState } from "react";
import Dashboard from "@/components/dashboard";
import { useAuth } from "@/app/AuthProvider";
import { tokenManager } from "@/lib/api-client";
import {
  User,
  BookOpen,
  FileText,
  Building2,
  FileDown,
  CheckSquare,
  X,
  Download,
} from "lucide-react";

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const closePdfModal = useCallback(() => {
    setShowPdfModal(false);
    // keep blob URL alive so re-open is instant; revoke only on unmount
  }, []);

  const handleDownloadAppraisal = useCallback(async () => {
    if (!user?.id) return;
    const token = tokenManager.getToken();
    if (!token) return;

    // If we already have the blob, just re-open the modal
    if (pdfBlobUrl) {
      setShowPdfModal(true);
      return;
    }

    setIsDownloading(true);
    try {
      const res = await fetch(`/api/appraisal/${user.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setShowPdfModal(true);
    } catch (err) {
      console.error("[DownloadAppraisal]", err);
    } finally {
      setIsDownloading(false);
    }
  }, [user, pdfBlobUrl]);

  return (
    <>
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
            onClick: handleDownloadAppraisal,
            icon: (
              <FileDown
                className={`w-6 h-6 text-indigo-600 ${isDownloading ? "animate-bounce" : ""}`}
              />
            ),
            label: isDownloading ? "Generating…" : "Download Appraisal",
            description: "Generate and download your appraisal PDF",
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

      {/* Fullscreen PDF modal — opens after fetch completes */}
      {pdfBlobUrl && showPdfModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
            <span className="text-white font-bold uppercase tracking-wider text-sm">
              Appraisal PDF
            </span>
            <div className="flex gap-3">
              <a
                href={pdfBlobUrl}
                download={`appraisal-${user?.id}.pdf`}
                className="flex items-center gap-1 rounded px-3 py-1 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={closePdfModal}
                className="flex items-center gap-1 rounded px-3 py-1 text-sm font-bold bg-gray-700 text-white hover:bg-gray-600"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
          <iframe
            src={pdfBlobUrl}
            className="flex-1 w-full border-0"
            title="Appraisal PDF"
          />
        </div>
      )}
    </>
  );
}


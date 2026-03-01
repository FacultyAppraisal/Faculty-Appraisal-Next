"use client";

import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { tokenManager } from "@/lib/api-client";

interface DownloadAppraisalPDFProps {
  userId: string;
}

/**
 * A button that triggers a server-side DOCX → PDF render and downloads
 * the resulting file directly in the browser.
 */
export default function DownloadAppraisalPDF({ userId }: DownloadAppraisalPDFProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = tokenManager.getToken();

      const res = await fetch(`/api/appraisal/${userId}/pdf`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Trigger browser download
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `appraisal-${userId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message ?? "Failed to download PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating PDF…
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            Download Appraisal PDF
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-xs text-center">{error}</p>
      )}
    </div>
  );
}

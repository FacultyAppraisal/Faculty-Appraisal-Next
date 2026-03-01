"use client";

import React from "react";
import { useAuth } from "@/app/AuthProvider";
import DownloadAppraisalPDF from "@/components/download-appraisal-pdf";

/**
 * Client-side section rendered below the dashboard quick links.
 * Reads the authenticated user's id from AuthContext and renders
 * the PDF download button.
 */
export default function FacultyDashboardActions() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mt-8 flex justify-center">
      <div className="bg-card rounded-2xl shadow-lg p-6 w-full max-w-md text-center space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Appraisal Report</h3>
        <p className="text-sm text-muted-foreground">
          Download your complete appraisal form as a PDF document.
        </p>
        <DownloadAppraisalPDF userId={user.id} />
      </div>
    </div>
  );
}

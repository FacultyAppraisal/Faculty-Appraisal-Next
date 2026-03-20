"use client";

import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { Download, RefreshCw, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APPRAISAL_STATUS } from "@/lib/constants";
import { tokenManager } from "@/lib/api-client";
import { useAuth } from "@/app/AuthProvider";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const getAuthConfig = () => {
  const token = tokenManager.getToken();
  return token
    ? { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
    : { withCredentials: true };
};

// --- TYPES ---
interface PartFReviewProps {
  /** Department slug (reserved for future department-scoped endpoints) */
  department: string;
  userId: string;
}

// --- COMPONENT ---
function PartFReview({ userId }: PartFReviewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [isFormFrozen, setIsFormFrozen] = useState(false);
  const [formStatus, setFormStatus] = useState(APPRAISAL_STATUS.PEDING);
  const [pdfExists, setPdfExists] = useState(false);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const encodedFacultyName = encodeURIComponent(`${(user?.name || userId).trim()}.pdf`);
  const pdfViewUrl = `/api/appraisal/${userId}/pdf/${encodedFacultyName}`;
  const pdfDownloadUrl = `${pdfViewUrl}?download=1`;

  // -----------------------------------------------------------------------
  // Status — GET /appraisal/:userId
  // -----------------------------------------------------------------------
  const fetchFormStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND}/appraisal/${userId}`, getAuthConfig());
      // Backend wraps: { success, data: IFacultyAppraisal, message }
      const appraisal = data?.data ?? data;
      setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      if (appraisal?.status && appraisal.status !== APPRAISAL_STATUS.PEDING) setIsFormFrozen(true);
      // Restore generated PDF availability
      if (appraisal?.pdfUrl) {
        setPdfExists(true);
      }
    } catch (err) {
      console.error("Fetch status failed", err);
    }
  }, [userId]);

  // -----------------------------------------------------------------------
  // PDF generation — Next.js proxy → Express → Cloudinary → JSON URL
  // -----------------------------------------------------------------------
  const generatePDF = useCallback(
    async () => {
      const token = tokenManager.getToken();
      if (!token || !userId) return;

      setLoading(true);
      setLoadingProgress(0);
      const tick = setInterval(
        () => setLoadingProgress((p) => (p >= 90 ? 90 : p + 10)),
        500
      );
      try {
        const res = await fetch(`/api/appraisal/${userId}/pdf`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = await res.json();
        const url = json?.data?.pdfUrl;
        if (!url) throw new Error("No PDF URL returned from server");
        setPdfExists(true);
        window.open(pdfViewUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.error("[PartF generatePDF]", err);
        setPdfExists(false);
      } finally {
        clearInterval(tick);
        setLoading(false);
        setLoadingProgress(100);
        setTimeout(() => setLoadingProgress(0), 400);
      }
    },
    [pdfViewUrl, userId]
  );

  useEffect(() => {
    fetchFormStatus();
  }, [fetchFormStatus]);

  // PATCH /appraisal/:userId/declaration  then  PATCH /appraisal/:userId/submit
  const handleFreeze = async () => {
    setSubmitError(null);
    try {
      // Step 1: record declaration agreement
      await axios.patch(
        `${BACKEND}/appraisal/${userId}/declaration`,
        { isAgreed: true },
        getAuthConfig()
      );
      // Step 2: transition DRAFT → SUBMITTED
      await axios.patch(`${BACKEND}/appraisal/${userId}/submit`, {}, getAuthConfig());
      setIsFormFrozen(true);
      setShowFreezeModal(false);
      fetchFormStatus();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setSubmitError(
        axErr.response?.data?.message ??
        "Submission failed. Please check your connection and try again."
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-[1.15rem]" style={{ lineHeight: 1.7 }}>
      <div className="rounded-2xl border-2 border-indigo-200 bg-card p-6 shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
          <div>
            <h2 className="text-xl font-black text-indigo-800 uppercase tracking-widest">
              Review and submit
            </h2>
            <p className="text-base text-indigo-700 uppercase opacity-85 font-semibold mt-1">
              Generate, save and freeze your appraisal document
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {pdfExists && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 py-2 px-4 text-base font-bold uppercase tracking-wider border-2 border-indigo-300 hover:bg-indigo-50"
              >
                <a href={pdfDownloadUrl}>
                  <Download size={18} /> Download
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-2 py-2 px-4 text-base font-bold uppercase tracking-wider border-2 border-indigo-300 hover:bg-indigo-50"
              onClick={() => generatePDF()}
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />{" "}
              {pdfExists ? "Regenerate Draft" : "Generate Draft"}
            </Button>
          </div>
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="mb-7 space-y-3">
            <div className="w-full rounded-full bg-muted h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
            </div>
            <p className="text-base text-center font-bold text-indigo-700 uppercase animate-pulse">
              Processing Appraisal Document... {loadingProgress}%
            </p>
          </div>
        )}

        {/* PDF Preview — button to reopen fullscreen */}
        {pdfExists && !loading && (
          <button
            onClick={() => window.open(pdfViewUrl, "_blank", "noopener,noreferrer")}
            className="w-full mb-6 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 py-4 text-base font-bold text-indigo-700 uppercase hover:bg-indigo-100 transition-colors"
          >
            <FileText size={18} /> Open PDF
          </button>
        )}

        {!pdfExists && !loading && (
          <div className="py-24 text-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50">
            <FileText size={56} className="mx-auto mb-4 opacity-30 text-indigo-700" />
            <p className="text-lg font-bold text-indigo-700 uppercase">No PDF generated for this session</p>
            <Button
              variant="link"
              size="sm"
              className="mt-3 text-base uppercase font-black text-indigo-700 hover:text-indigo-900"
              onClick={() => generatePDF()}
            >
              Generate Now
            </Button>
          </div>
        )}
      </div>

      {formStatus === APPRAISAL_STATUS.PEDING && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-6 py-4">
          <input
            id="declaration-agree"
            type="checkbox"
            checked={declarationAgreed}
            onChange={(e) => setDeclarationAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-indigo-400 text-indigo-700 focus:ring-indigo-400 cursor-pointer"
          />
          <label htmlFor="declaration-agree" className="text-base font-bold text-indigo-900 leading-relaxed cursor-pointer select-none">
            I hereby declare that the information furnished above is true, complete, and correct to the best of my knowledge and belief.
            I understand that submitting this form is <span className="text-destructive font-black">irreversible</span> and will lock all parts of my appraisal.
          </label>
        </div>
      )}

      {submitError && (
        <div className="mx-auto max-w-lg p-4 rounded-lg bg-destructive/15 border-2 border-destructive/30 text-destructive text-base font-bold uppercase text-center tracking-wider">
          {submitError}
        </div>
      )}

      {/* Freeze / Frozen banner */}
      {isFormFrozen ? (
        <div className="flex items-center justify-center gap-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-7 py-5 shadow-md">
          <ShieldAlert size={24} className="text-indigo-700 flex-shrink-0" />
          <p className="text-lg font-black text-indigo-800 uppercase tracking-wider">
            Document Frozen &bull; Status: {formStatus}
          </p>
        </div>
      ) : (
        formStatus === APPRAISAL_STATUS.PEDING && (
          <div className="flex justify-center pt-3">
            <Button
              onClick={() => setShowFreezeModal(true)}
              disabled={!declarationAgreed}
              className="group relative h-16 px-12 overflow-hidden rounded-2xl bg-indigo-700 text-white transition-all hover:bg-indigo-800 hover:scale-[1.02] active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <ShieldAlert size={24} className="transition-transform group-hover:rotate-12 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-base font-black uppercase tracking-widest leading-none">Final Submission</p>
                  <p className="text-lg font-bold opacity-90 mt-1">Freeze &amp; Submit Appraisal</p>
                </div>
              </div>
            </Button>
          </div>
        )
      )}

      {/* Confirm Freeze Dialog */}
      <Dialog open={showFreezeModal} onOpenChange={setShowFreezeModal}>
        <DialogContent className="max-w-md bg-card border-2 border-indigo-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-widest text-destructive">
              Critical: Confirm Freeze
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-3">
            <p className="text-base text-indigo-900 leading-relaxed uppercase tracking-tight font-semibold">
              Freezing will lock all 6 parts of your appraisal form. You will not be able to make
              further changes until the evaluation cycle is reset by the admin.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 text-base font-bold uppercase border-2" onClick={() => setShowFreezeModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 text-base font-bold uppercase" onClick={handleFreeze}>
                Lock &amp; Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PartFReview;
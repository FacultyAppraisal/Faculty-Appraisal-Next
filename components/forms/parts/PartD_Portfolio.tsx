"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PART_D_MAX, PART_D_SELF_MAX } from "@/lib/forms/constants";
import { DesignationValue, APPRAISAL_STATUS } from "@/lib/constants";
import SectionCard from "../shared/SectionCard";
import FormProgressBar from "../shared/FormProgressBar";
import FormLockedModal from "../shared/FormLockedModal";
import SuccessModal from "../shared/SuccessModal";
import Loader from "@/components/loader";
import axios, { AxiosError } from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// --- CONSTANTS ---
const PORTFOLIO_TYPES = ["institute", "department", "both"] as const;

// --- SECTION MANDATORY CONFIG ---
// Defines which sections of Part D are mandatory for form submission.
// Faculty must declare a portfolio type and provide self-awarded marks.
const SECTION_CONFIG = [
  { name: "Portfolio Type Selection", key: "portfolioType" as const, mandatory: true },
  { name: "Self-Awarded Marks", key: "selfAwardedMarks" as const, mandatory: true },
];

// --- TYPES ---
interface PortfolioFormData {
  portfolioType: "institute" | "department" | "both";
  selfAwardedMarks: number;
  deanMarks: number;
  hodMarks: number;
  isMarkHOD: boolean;
  isMarkDean: boolean;
  isAdministrativeRole: boolean;
  administrativeRole: string;
  adminSelfAwardedMarks: number;
  directorMarks: number;
  adminDeanMarks: number;
}

interface PartDPortfolioProps {
  userId: string;
  isAdminFromDesignation: boolean;
  userDesignation: DesignationValue;
}

// --- COMPONENT ---
function PartDPortfolio({
  userId,
  isAdminFromDesignation,
  userDesignation,
}: PartDPortfolioProps) {
  const [formData, setFormData] = useState<PortfolioFormData>({
    portfolioType: "both",
    selfAwardedMarks: 0,
    deanMarks: 0,
    hodMarks: 0,
    isMarkHOD: false,
    isMarkDean: false,
    isAdministrativeRole: isAdminFromDesignation,
    administrativeRole: userDesignation,
    adminSelfAwardedMarks: 0,
    directorMarks: 0,
    adminDeanMarks: 0,
  });

  const [instituteLevelPortfolio, setInstituteLevelPortfolio] = useState("");
  const [departmentLevelPortfolio, setDepartmentLevelPortfolio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(APPRAISAL_STATUS.PEDING);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const STORAGE_KEY = `partD_data_${userId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const { instituteLevelPortfolio: inst, departmentLevelPortfolio: dept, ...rest } = parsed;
          setFormData(rest);
          if (inst !== undefined) setInstituteLevelPortfolio(inst);
          if (dept !== undefined) setDepartmentLevelPortfolio(dept);
        }
      } catch (e) {
        console.error("Failed to parse saved Part D data", e);
      }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isLoading)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...formData,
          instituteLevelPortfolio,
          departmentLevelPortfolio,
        })
      );
  }, [formData, instituteLevelPortfolio, departmentLevelPortfolio, STORAGE_KEY, isLoading]);

  // Score Calculations
  const scores = {
    self: Math.min(
      PART_D_SELF_MAX,
      formData.isAdministrativeRole
        ? formData.adminSelfAwardedMarks
        : formData.selfAwardedMarks
    ),
    superior: formData.isAdministrativeRole
      ? formData.administrativeRole === "Associate Dean" ||
        formData.administrativeRole === "associate_dean"
        ? formData.adminDeanMarks
        : formData.directorMarks
      : formData.portfolioType === "both"
        ? ((formData.deanMarks ?? 0) + (formData.hodMarks ?? 0)) / 2
        : formData.portfolioType === "institute"
          ? formData.deanMarks
          : formData.hodMarks,
  };

  const totalScore = Math.min(PART_D_MAX, scores.self + scores.superior);
  const locked = formStatus !== APPRAISAL_STATUS.PEDING;

  const selfMarksValue = formData.isAdministrativeRole
    ? formData.adminSelfAwardedMarks
    : formData.selfAwardedMarks;

  const showInstitute =
    formData.portfolioType === "both" ||
    formData.portfolioType === "institute" ||
    formData.isAdministrativeRole;
  const showDepartment =
    formData.portfolioType === "both" ||
    formData.portfolioType === "department" ||
    formData.isAdministrativeRole;

  let interactedCount = 0;
  let totalFields = 1; // self marks
  if (selfMarksValue > 0) interactedCount++;
  if (showInstitute) {
    totalFields++;
    if (instituteLevelPortfolio.trim().length > 0) interactedCount++;
  }
  if (showDepartment) {
    totalFields++;
    if (departmentLevelPortfolio.trim().length > 0) interactedCount++;
  }
  const progressPercent = totalFields > 0 ? (interactedCount / totalFields) * 100 : 0;

  // ── Always fetch the latest status from backend (independent of data cache) ──
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        const appraisal = resp.data?.data;
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch { /* silently ignore */ }
    };
    fetchStatus();
  }, [userId]);

  // Load from backend — GET /appraisal/:userId → read partD
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ── Prefer cache ───────────────────────────────────────────────────
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const hasData = parsed && (
              parsed.selfAwardedMarks > 0 ||
              parsed.adminSelfAwardedMarks > 0 ||
              parsed.instituteLevelPortfolio?.length > 0 ||
              parsed.departmentLevelPortfolio?.length > 0
            );
            if (hasData) {
              // Restore the text areas too (stored inline in same object for D)
              if (parsed.instituteLevelPortfolio !== undefined)
                setInstituteLevelPortfolio(parsed.instituteLevelPortfolio);
              if (parsed.departmentLevelPortfolio !== undefined)
                setDepartmentLevelPortfolio(parsed.departmentLevelPortfolio);
              setIsLoading(false);
              return;
            }
          } catch { /* ignore, proceed to fetch */ }
        }

        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        // Backend wraps: { success, data: IFacultyAppraisal, message }
        const appraisal = resp.data?.data;
        const d = appraisal?.partD;
        if (d) {
          const newFormData: PortfolioFormData = {
            portfolioType: d.portfolioType ?? "both",
            selfAwardedMarks: d.selfAwardedMarks ?? 0,
            deanMarks: d.deanMarks ?? 0,
            hodMarks: d.hodMarks ?? 0,
            isMarkHOD: d.isMarkHOD ?? false,
            isMarkDean: d.isMarkDean ?? false,
            isAdministrativeRole: d.isAdministrativeRole ?? isAdminFromDesignation,
            administrativeRole: d.administrativeRole ?? userDesignation,
            adminSelfAwardedMarks: d.adminSelfAwardedMarks ?? 0,
            directorMarks: d.directorMarks ?? 0,
            adminDeanMarks: d.adminDeanMarks ?? 0,
          };
          const newInstitute = d.instituteLevelPortfolio ?? "";
          const newDepartment = d.departmentLevelPortfolio ?? "";

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...newFormData,
              instituteLevelPortfolio: newInstitute,
              departmentLevelPortfolio: newDepartment,
            })
          );

          setFormData(newFormData);
          setInstituteLevelPortfolio(newInstitute);
          setDepartmentLevelPortfolio(newDepartment);
        }
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch (err) {
        console.error("Fetch Part D failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId, isAdminFromDesignation, userDesignation, STORAGE_KEY]);

  // PUT /appraisal/:userId/part-d
  const handleSubmit = async () => {
    if (locked) {
      setShowStatusModal(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Shape matches partD Mongoose sub-schema exactly
      const payload = {
        portfolioType: formData.portfolioType,
        instituteLevelPortfolio: instituteLevelPortfolio,
        departmentLevelPortfolio: departmentLevelPortfolio,
        selfAwardedMarks: formData.selfAwardedMarks,
        isAdministrativeRole: formData.isAdministrativeRole,
        administrativeRole: formData.administrativeRole,
        adminSelfAwardedMarks: formData.adminSelfAwardedMarks,
        totalClaimed: scores.self,
        totalVerified: 0,
      };
      await axios.put(`${BACKEND}/appraisal/${userId}/part-d`, payload, { withCredentials: true });
      setShowSuccessModal(true);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setSubmitError(axErr.response?.data?.message ?? axErr.message ?? "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) return <Loader message="Loading portfolio data…" />;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-[1.15rem]" style={{ lineHeight: 1.7 }}>
      <FormProgressBar progress={progressPercent} label="Part D Completion" />

      {!formData.isAdministrativeRole && (
        <SectionCard title="Portfolio Selection">
          <div className="flex gap-4 mb-5">
            {PORTFOLIO_TYPES.map((t) => (
              <button
                key={t}
                disabled={locked}
                onClick={() => setFormData((p) => ({ ...p, portfolioType: t }))}
                className={`flex-1 py-4 px-4 rounded-xl border-2 text-base font-extrabold uppercase tracking-wider transition-all ${formData.portfolioType === t
                  ? "bg-indigo-700 text-white border-indigo-700 shadow-md"
                  : "bg-white text-indigo-800 border-indigo-300 hover:border-indigo-700 hover:text-indigo-900"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50`}
              >
                {t} Level
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {showInstitute && (
        <SectionCard title="Institute Level Portfolio">
          <Textarea
            placeholder="Describe your institute level contributions..."
            value={instituteLevelPortfolio}
            disabled={locked}
            onChange={(e) => setInstituteLevelPortfolio(e.target.value)}
            rows={6}
            className="resize-none text-lg placeholder:italic placeholder:text-muted-foreground font-medium text-slate-900 border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-300 shadow-sm"
          />
        </SectionCard>
      )}

      {showDepartment && (
        <SectionCard title="Department Level Portfolio">
          <Textarea
            placeholder="Describe your department level contributions..."
            value={departmentLevelPortfolio}
            disabled={locked}
            onChange={(e) => setDepartmentLevelPortfolio(e.target.value)}
            rows={6}
            className="resize-none text-lg placeholder:italic placeholder:text-muted-foreground font-medium text-slate-900 border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-300 shadow-sm"
          />
        </SectionCard>
      )}

      {/* Self Assessment */}
      <SectionCard title="Self Assessment">
        <div className="flex items-center justify-between py-4 px-2">
          <div>
            <p className="text-lg font-extrabold text-indigo-900 uppercase tracking-tight">
              Self-Awarded Marks
            </p>
            <p className="text-base text-indigo-700 uppercase font-semibold mt-1">
              Maximum {PART_D_SELF_MAX} points
            </p>
          </div>
          <input
            type="number"
            min={0}
            max={PART_D_SELF_MAX}
            disabled={locked}
            aria-label="Self-Awarded Marks"
            onWheel={(e) => e.currentTarget.blur()}
            value={selfMarksValue === 0 ? "" : selfMarksValue}
            onChange={(e) => {
              const v = Math.min(PART_D_SELF_MAX, Math.max(0, Number(e.target.value)));
              setFormData((p) =>
                formData.isAdministrativeRole
                  ? { ...p, adminSelfAwardedMarks: v }
                  : { ...p, selfAwardedMarks: v }
              );
            }}
            className="w-28 rounded-lg border-2 border-indigo-300 bg-white px-4 py-2 text-lg text-right font-black tabular-nums text-indigo-900 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-700 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
          />
        </div>
      </SectionCard>

      {/* Score Summary */}
      <SectionCard title="Score Summary">
        <div className="overflow-hidden rounded-xl border-2 border-indigo-200">
          <table className="w-full text-base">
            <tbody className="divide-y divide-indigo-100">
              <tr className="bg-indigo-50">
                <td className="px-6 py-4 font-semibold uppercase tracking-widest text-base text-indigo-700">
                  Self Evaluation
                </td>
                <td className="px-6 py-4 text-right font-extrabold tabular-nums text-indigo-900">
                  {scores.self} / {PART_D_SELF_MAX}
                </td>
              </tr>
              <tr className="bg-indigo-50">
                <td className="px-6 py-4 font-semibold uppercase tracking-widest text-base text-indigo-700">
                  Superior Evaluation
                </td>
                <td className="px-6 py-4 text-right font-extrabold tabular-nums text-indigo-900">
                  {scores.superior} / {PART_D_SELF_MAX}
                </td>
              </tr>
              <tr className="bg-indigo-100 font-extrabold border-t-2 border-indigo-200">
                <td className="px-6 py-5 font-black uppercase tracking-widest text-indigo-800 text-lg">
                  Total Portfolio Score
                </td>
                <td className="px-6 py-5 text-right font-black tabular-nums text-2xl text-indigo-800">
                  {totalScore} / {PART_D_MAX}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {submitError && (
        <p className="text-base text-center text-destructive font-extrabold">{submitError}</p>
      )}

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || locked}
          aria-label="Save Portfolio Details"
          className="min-w-[260px] shadow-lg shadow-indigo-200 uppercase tracking-widest text-base font-black bg-indigo-700 hover:bg-indigo-800 text-white transition-all transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting ? "Saving..." : "Save Portfolio Details"}
        </Button>
      </div>

      {showStatusModal && (
        <FormLockedModal formStatus={formStatus} onClose={() => setShowStatusModal(false)} />
      )}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Portfolio details saved successfully!"
      />
    </div>
  );
}

export default PartDPortfolio;
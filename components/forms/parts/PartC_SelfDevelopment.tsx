"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PART_C_ROLE_MAX, PART_C_SECTION_MAXES } from "@/lib/forms/constants";
import { DesignationValue, APPRAISAL_STATUS } from "@/lib/constants";
import SectionCard from "../shared/SectionCard";
import ScoreCard from "../shared/ScoreCard";
import FormProgressBar from "../shared/FormProgressBar";
import FormLockedModal from "../shared/FormLockedModal";
import Loader from "@/components/loader";
import axios, { AxiosError } from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// --- CONSTANTS ---
const FORMULAS = {
  qualification: "Marks=20 (Completed/Awarded), 15 (Ongoing)",
  attended: "Marks: 2-week=20, 1-week=10, 2-5 days=5, 1-day=2 (Max 40)",
  organized: "Marks: 2-week=40, 1-week=20, 2-5 days=10, 1-day=2 (Max 80)",
  phdGuided: "Marks: Awarded=50, Thesis Submitted=25, Guiding=10 (No limit)",
};

// --- SECTION MANDATORY CONFIG ---
// Defines which sections of Part C are mandatory for form submission.
// Qualification status must be declared; training/PhD sections are optional.
const SECTION_CONFIG = [
  { name: "Qualification (PhD Status)", key: "qualification" as const, mandatory: true },
  { name: "Training Programs Attended", key: "trainingAttended" as const, mandatory: false },
  { name: "Training Programs Organized", key: "trainingOrganized" as const, mandatory: false },
  { name: "PhD Guided", key: "phdGuided" as const, mandatory: false },
];

// --- TYPES ---
interface SelfDevData {
  pdfCompleted: boolean;
  pdfOngoing: boolean;
  phdAwarded: boolean;
  twoWeekProgram: number;
  oneWeekProgram: number;
  twoToFiveDayProgram: number;
  oneDayProgram: number;
  organizedTwoWeekProgram: number;
  organizedOneWeekProgram: number;
  organizedTwoToFiveDayProgram: number;
  organizedOneDayProgram: number;
  phdDegreeAwarded: number;
  phdThesisSubmitted: number;
  phdScholarsGuiding: number;
}

interface PartCSelfDevelopmentProps {
  userId: string;
  userDesignation: DesignationValue;
}

type QualStatus = "pdfCompleted" | "pdfOngoing" | "phdAwarded" | "none";

// --- HELPERS ---
const TransparencyGuideline = ({ formula }: { formula: string }) => (
  <div className="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-100 shadow-sm mb-5">
    <p className="text-base font-extrabold text-indigo-700 uppercase tracking-widest mb-2 opacity-90">
      Computation Guidelines
    </p>
    <p className="text-lg text-indigo-900 leading-relaxed italic font-semibold">{formula}</p>
  </div>
);

function NumericRow({
  label,
  hint,
  name,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-indigo-100 last:border-0 hover:bg-indigo-50/50 transition-colors px-2">
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-indigo-900 uppercase tracking-tight">{label}</p>
        {hint && (
          <p className="text-base text-indigo-700 uppercase font-semibold tracking-tight opacity-85">
            {hint}
          </p>
        )}
      </div>
      <input
        type="number"
        name={name}
        min={0}
        disabled={disabled}
        aria-label={label}
        onKeyDown={(e) => e.key === "-" && e.preventDefault()}
        onWheel={(e) => e.currentTarget.blur()}
        value={value === 0 ? "" : value}
        onChange={onChange}
        placeholder="Enter count"
        className="w-24 shrink-0 rounded-lg border-2 border-indigo-300 bg-white px-4 py-2 text-lg text-right font-black text-indigo-900 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-700 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 shadow-sm placeholder:text-xs placeholder:font-normal placeholder:text-slate-900"
      />
    </div>
  );
}

// --- COMPONENT ---
function PartCSelfDevelopment({ userId, userDesignation }: PartCSelfDevelopmentProps) {
  const [formData, setFormData] = useState<SelfDevData>({
    pdfCompleted: false,
    pdfOngoing: false,
    phdAwarded: false,
    twoWeekProgram: 0,
    oneWeekProgram: 0,
    twoToFiveDayProgram: 0,
    oneDayProgram: 0,
    organizedTwoWeekProgram: 0,
    organizedOneWeekProgram: 0,
    organizedTwoToFiveDayProgram: 0,
    organizedOneDayProgram: 0,
    phdDegreeAwarded: 0,
    phdThesisSubmitted: 0,
    phdScholarsGuiding: 0,
  });

  const [verifiedScore, setVerifiedScore] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(APPRAISAL_STATUS.PEDING);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const STORAGE_KEY = `partC_data_${userId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) setFormData(parsed);
      } catch (e) {
        console.error("Failed to parse saved Part C data", e);
      }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData, STORAGE_KEY, isLoading]);

  // Score Calculations
  const scores = {
    qual: formData.pdfCompleted || formData.phdAwarded ? 20 : formData.pdfOngoing ? 15 : 0,
    attended: Math.min(
      PART_C_SECTION_MAXES.attended,
      formData.twoWeekProgram * 20 +
      formData.oneWeekProgram * 10 +
      formData.twoToFiveDayProgram * 5 +
      formData.oneDayProgram * 2
    ),
    organized: Math.min(
      PART_C_SECTION_MAXES.organized,
      formData.organizedTwoWeekProgram * 40 +
      formData.organizedOneWeekProgram * 20 +
      formData.organizedTwoToFiveDayProgram * 10 +
      formData.organizedOneDayProgram * 2
    ),
    phd:
      formData.phdDegreeAwarded * 50 +
      formData.phdThesisSubmitted * 25 +
      formData.phdScholarsGuiding * 10,
  };

  const maxTotal = PART_C_ROLE_MAX[userDesignation] ?? 180;
  const totalScore = Math.min(maxTotal, Object.values(scores).reduce((a, b) => a + b, 0));

  const fieldsToExclude = ["pdfCompleted", "pdfOngoing", "phdAwarded"];
  const interactedCount =
    Object.entries(formData).filter(
      ([k, v]) => !fieldsToExclude.includes(k) && (v as number) > 0
    ).length + (formData.pdfCompleted || formData.pdfOngoing || formData.phdAwarded ? 1 : 0);
  const totalFields = 1 + (Object.keys(formData).length - 3);
  const progressPercent = (interactedCount / totalFields) * 100;

  // Load from backend — GET /appraisal/:userId → read partC
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        // Backend wraps: { success, data: IFacultyAppraisal, message }
        const appraisal = resp.data?.data;
        const d = appraisal?.partC;
        if (d) {
          // Map from schema field names to local SelfDevData
          setFormData({
            pdfCompleted: d.pdfCompleted ?? false,
            pdfOngoing: d.pdfOngoing ?? false,
            phdAwarded: d.phdAwarded ?? false,
            twoWeekProgram: d.trainingAttended?.twoWeek ?? 0,
            oneWeekProgram: d.trainingAttended?.oneWeek ?? 0,
            twoToFiveDayProgram: d.trainingAttended?.twoToFiveDays ?? 0,
            oneDayProgram: d.trainingAttended?.oneDay ?? 0,
            organizedTwoWeekProgram: d.trainingOrganized?.twoWeek ?? 0,
            organizedOneWeekProgram: d.trainingOrganized?.oneWeek ?? 0,
            organizedTwoToFiveDayProgram: d.trainingOrganized?.twoToFiveDays ?? 0,
            organizedOneDayProgram: d.trainingOrganized?.oneDay ?? 0,
            phdDegreeAwarded: d.phdGuided?.awarded ?? 0,
            phdThesisSubmitted: d.phdGuided?.submitted ?? 0,
            phdScholarsGuiding: d.phdGuided?.ongoing ?? 0,
          });
          setVerifiedScore(d?.verifiedMarks ?? undefined);
        }
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch (err) {
        console.error("Fetch Part C failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const qualStatus: QualStatus = formData.pdfCompleted
    ? "pdfCompleted"
    : formData.pdfOngoing
      ? "pdfOngoing"
      : formData.phdAwarded
        ? "phdAwarded"
        : "none";

  const setQual = (f: QualStatus) =>
    setFormData((p) => ({
      ...p,
      pdfCompleted: f === "pdfCompleted",
      pdfOngoing: f === "pdfOngoing",
      phdAwarded: f === "phdAwarded",
    }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: Math.max(0, Number(e.target.value)) }));

  // PUT /appraisal/:userId/part-c
  const handleSubmit = async () => {
    if (formStatus !== APPRAISAL_STATUS.PEDING) {
      setShowStatusModal(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Shape matches partC Mongoose sub-schema exactly
      const payload = {
        pdfCompleted: formData.pdfCompleted,
        pdfOngoing: formData.pdfOngoing,
        phdAwarded: formData.phdAwarded,
        trainingAttended: {
          twoWeek: formData.twoWeekProgram,
          oneWeek: formData.oneWeekProgram,
          twoToFiveDays: formData.twoToFiveDayProgram,
          oneDay: formData.oneDayProgram,
        },
        trainingOrganized: {
          twoWeek: formData.organizedTwoWeekProgram,
          oneWeek: formData.organizedOneWeekProgram,
          twoToFiveDays: formData.organizedTwoToFiveDayProgram,
          oneDay: formData.organizedOneDayProgram,
        },
        phdGuided: {
          awarded: formData.phdDegreeAwarded,
          submitted: formData.phdThesisSubmitted,
          ongoing: formData.phdScholarsGuiding,
        },
        totalMarks: totalScore,
      };
      await axios.put(`${BACKEND}/appraisal/${userId}/part-c`, payload, { withCredentials: true });
      setSubmitSuccess(true);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setSubmitError(axErr.response?.data?.message ?? axErr.message ?? "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader message="Loading self-development data…" />;
  const locked = formStatus !== APPRAISAL_STATUS.PEDING;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-[1.15rem]" style={{ lineHeight: 1.7 }}>
      <FormProgressBar progress={progressPercent} label="Part C Completion" />

      {/* Qualification */}
      <SectionCard title="Qualification">
        <TransparencyGuideline formula={FORMULAS.qualification} />
        <div className="grid grid-cols-1 gap-3 mb-5">
          {(["pdfCompleted", "pdfOngoing", "phdAwarded", "none"] as QualStatus[]).map((v) => (
            <label
              key={v}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${qualStatus === v
                ? "bg-indigo-700 text-white border-indigo-700 shadow-md"
                : "bg-white text-indigo-800 border-indigo-300 hover:border-indigo-700 hover:text-indigo-900"
                } ${locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"} focus-within:ring-2 focus-within:ring-indigo-400`}
            >
              <input
                type="radio"
                name="qualStatus"
                disabled={locked}
                checked={qualStatus === v}
                onChange={() => setQual(v)}
                className="sr-only"
                aria-label={
                  v === "pdfCompleted"
                    ? "Ph.D. Completed"
                    : v === "pdfOngoing"
                      ? "Ph.D. Ongoing"
                      : v === "phdAwarded"
                        ? "Ph.D. Degree Awarded / Thesis Submitted"
                        : "None"
                }
              />
              <span className="text-base font-extrabold uppercase tracking-tight">
                {v === "pdfCompleted"
                  ? "Ph.D. Completed"
                  : v === "pdfOngoing"
                    ? "Ph.D. Ongoing"
                    : v === "phdAwarded"
                      ? "Ph.D. Degree Awarded / Thesis Submitted"
                      : "None"}
              </span>
            </label>
          ))}
        </div>
        <ScoreCard label="Qualification Score" score={scores.qual} total={20} />
      </SectionCard>

      {/* Training Attended */}
      <SectionCard title="Training Programs Attended">
        <TransparencyGuideline formula={FORMULAS.attended} />
        <NumericRow label="2-week Programs Attended" hint="20 pts each" name="twoWeekProgram" value={formData.twoWeekProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="1-week Programs Attended" hint="10 pts each" name="oneWeekProgram" value={formData.oneWeekProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="2–5 Day Programs Attended" hint="5 pts each" name="twoToFiveDayProgram" value={formData.twoToFiveDayProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="1 Day Programs Attended" hint="2 pts each" name="oneDayProgram" value={formData.oneDayProgram} onChange={handleChange} disabled={locked} />
        <ScoreCard label="Attended Score" score={scores.attended} total={40} />
      </SectionCard>

      {/* Training Organized */}
      <SectionCard title="Training Programs Organized">
        <TransparencyGuideline formula={FORMULAS.organized} />
        <NumericRow label="2-week Programs Organized" hint="40 pts each" name="organizedTwoWeekProgram" value={formData.organizedTwoWeekProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="1-week Programs Organized" hint="20 pts each" name="organizedOneWeekProgram" value={formData.organizedOneWeekProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="2–5 Day Programs Organized" hint="10 pts each" name="organizedTwoToFiveDayProgram" value={formData.organizedTwoToFiveDayProgram} onChange={handleChange} disabled={locked} />
        <NumericRow label="1 Day Programs Organized" hint="2 pts each" name="organizedOneDayProgram" value={formData.organizedOneDayProgram} onChange={handleChange} disabled={locked} />
        <ScoreCard label="Organized Score" score={scores.organized} total={80} />
      </SectionCard>

      {/* Ph.D. Guided */}
      <SectionCard title="Ph.D. Guided (Extra)">
        <TransparencyGuideline formula={FORMULAS.phdGuided} />
        <NumericRow label="Ph.D. Degrees Awarded" hint="50 pts each" name="phdDegreeAwarded" value={formData.phdDegreeAwarded} onChange={handleChange} disabled={locked} />
        <NumericRow label="Ph.D. Thesis Submitted" hint="25 pts each" name="phdThesisSubmitted" value={formData.phdThesisSubmitted} onChange={handleChange} disabled={locked} />
        <NumericRow label="Ph.D. Scholars Currently Guiding" hint="10 pts each" name="phdScholarsGuiding" value={formData.phdScholarsGuiding} onChange={handleChange} disabled={locked} />
        <ScoreCard label="Ph.D. Guided Score" score={scores.phd} total="No limit" />
      </SectionCard>

      {/* Score Summary */}
      <SectionCard title="Score Summary">
        <div className="overflow-hidden rounded-xl border-2 border-indigo-200">
          <table className="w-full text-base">
            <tbody className="divide-y divide-indigo-100">
              <tr className="hidden">
                <td className="px-6 py-4 font-semibold uppercase tracking-widest text-base text-green-700">
                  Score After Verification
                </td>
                <td className="px-6 py-4 text-right font-extrabold tabular-nums text-green-700">
                  {verifiedScore ?? "Pending"}
                </td>
              </tr>
              <tr className="bg-indigo-100 font-extrabold border-t-2 border-indigo-200">
                <td className="px-6 py-5 font-black uppercase tracking-widest text-indigo-800 text-lg">
                  Total Part C Score
                </td>
                <td className="px-6 py-5 text-right font-black tabular-nums text-2xl text-indigo-800">
                  {totalScore} / {maxTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {submitSuccess && (
        <p className="text-base text-center text-indigo-700 font-semibold italic">
          Changes saved successfully.
        </p>
      )}
      {submitError && (
        <p className="text-base text-center text-destructive font-extrabold">{submitError}</p>
      )}

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || locked}
          aria-label="Save Development Details"
          className="min-w-[260px] shadow-lg shadow-indigo-200 uppercase tracking-widest text-base font-black bg-indigo-700 hover:bg-indigo-800 text-white transition-all transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting ? "Saving…" : "Save Development Details"}
        </Button>
      </div>

      {showStatusModal && (
        <FormLockedModal formStatus={formStatus} onClose={() => setShowStatusModal(false)} />
      )}
    </div>
  );
}

export default PartCSelfDevelopment;


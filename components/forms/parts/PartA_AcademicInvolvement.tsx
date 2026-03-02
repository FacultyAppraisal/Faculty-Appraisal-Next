"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROLE_FACTOR, ROLE_MAX, PART_A_MAXES, PartAScoreKey } from "@/lib/forms/constants";
import { DesignationValue, APPRAISAL_STATUS } from "@/lib/constants";
import { useCourses } from "@/context/CourseContext";
import SectionCard from "../shared/SectionCard";
import FormProgressBar from "../shared/FormProgressBar";
import CourseManagementHeader from "../shared/CourseManagementHeader";
import FormLockedModal from "../shared/FormLockedModal";
import SuccessModal from "../shared/SuccessModal";
import Loader from "@/components/loader";
import axios, { AxiosError } from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// --- CONSTANTS ---
const ACADEMIC_SECTIONS: {
  title: string;
  field: PartAScoreKey;
  formula: string;
}[] = [
    {
      title: "Result Analysis",
      field: "resultAnalysis",
      formula: "Marks = 10 * [(Students > 60% * 5 + Students 50-59% * 4 + Students 40-49% * 3) / Total Students]",
    },
    {
      title: "Course Outcome Analysis",
      field: "courseOutcome",
      formula: "Marks = 20 + (Avg CO % * 30 / 100) [for timely submission]",
    },
    {
      title: "E-Learning Content Development",
      field: "eLearning",
      formula: "Marks = Number of instances * 10",
    },
    {
      title: "Academic Engagement",
      field: "academicEngagement",
      formula: "Marks = 50 * (Present Students / Enrolled Students Total)",
    },
    {
      title: "Teaching Load",
      field: "teachingLoad",
      formula: "Marks = Min(50, 50 * [(Avg Load + E) / Min Load]) [Min Load: Prof=12, Assoc=14, Asst=16]",
    },
    {
      title: "UG Projects / PG Dissertations Guided",
      field: "projectsGuided",
      formula: "Marks = Min(40, Count * 20)",
    },
    {
      title: "Feedback of Faculty by Student",
      field: "studentFeedback",
      formula: "Marks = Average Feedback Performance Index",
    },
    {
      title: "Guardian / PTG Meetings",
      field: "ptgMeetings",
      formula: "Marks = (Meetings * 50) / 6 [Max 50]",
    },
  ];

// --- SECTION MANDATORY CONFIG ---
const SECTION_CONFIG: { name: string; field: PartAScoreKey; mandatory: boolean }[] = [
  { name: "Result Analysis", field: "resultAnalysis", mandatory: true },
  { name: "Course Outcome Analysis", field: "courseOutcome", mandatory: true },
  { name: "E-Learning Content Development", field: "eLearning", mandatory: false },
  { name: "Academic Engagement", field: "academicEngagement", mandatory: true },
  { name: "Teaching Load", field: "teachingLoad", mandatory: true },
  { name: "UG Projects / PG Dissertations Guided", field: "projectsGuided", mandatory: false },
  { name: "Feedback of Faculty by Student", field: "studentFeedback", mandatory: true },
  { name: "Guardian / PTG Meetings", field: "ptgMeetings", mandatory: false },
];

// --- TYPES ---
interface CourseData {
  studentsAbove60: string;
  students50to59: string;
  students40to49: string;
  totalStudents: string;
  coAttainment: string;
  timelySubmissionCO: boolean;
  studentsPresent: string;
  totalEnrolledStudents: string;
  feedbackPercentage: string;
}

interface ScoreState {
  resultAnalysis: number;
  courseOutcome: number;
  eLearning: number;
  academicEngagement: number;
  teachingLoad: number;
  projectsGuided: number;
  studentFeedback: number;
  ptgMeetings: number;
}

interface GlobalMetrics {
  eLearningInstances: string;
  weeklyLoadSem1: string;
  weeklyLoadSem2: string;
  phdScholar: boolean;
  projectsGuided: string;
  ptgMeetings: string;
}

interface PartAAcademicInvolvementProps {
  userDesignation?: DesignationValue;
  userId: string;
}

// --- HELPERS ---
const MetricInputField = ({
  label,
  value,
  onChange,
  className = "",
  placeholder = "Enter value",
  disabled = false,
}: {
  label: string;
  value?: string | number | null;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div className={`space-y-2 ${className}`}>
    <label
      className="text-base uppercase font-extrabold text-indigo-900 tracking-wider block px-0.5"
      style={{ letterSpacing: "0.08em" }}
    >
      {label}
    </label>
    <input
      type="number"
      min={0}
      disabled={disabled}
      aria-label={label}
      onWheel={(e) => e.currentTarget.blur()}
      onKeyDown={(e) => e.key === "-" && e.preventDefault()}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border-2 border-indigo-200 bg-white px-4 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-600 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm placeholder:text-xs placeholder:font-normal placeholder:text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
);

// --- COMPONENT ---
function PartAAcademicInvolvement({
  userDesignation = "Professor",
  userId,
}: PartAAcademicInvolvementProps) {
  const { courses, isInitialized, setCourses } = useCourses();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState(APPRAISAL_STATUS.PEDING);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [manualSections, setManualSections] = useState<Record<PartAScoreKey, boolean>>({
    resultAnalysis: false,
    courseOutcome: false,
    eLearning: false,
    academicEngagement: false,
    teachingLoad: false,
    projectsGuided: false,
    studentFeedback: false,
    ptgMeetings: false,
  });

  const [scores, setScores] = useState<ScoreState>({
    resultAnalysis: 0,
    courseOutcome: 0,
    eLearning: 0,
    academicEngagement: 0,
    teachingLoad: 0,
    projectsGuided: 0,
    studentFeedback: 0,
    ptgMeetings: 0,
  });

  const [courseMetrics, setCourseMetrics] = useState<Record<string, CourseData>>({});

  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    eLearningInstances: "",
    weeklyLoadSem1: "",
    weeklyLoadSem2: "",
    phdScholar: false,
    projectsGuided: "",
    ptgMeetings: "",
  });

  // --- LOCAL STORAGE PERSISTENCE ---
  const STORAGE_KEY = `partA_data_${userId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.courseMetrics) setCourseMetrics(parsed.courseMetrics);
        if (parsed.globalMetrics) setGlobalMetrics(parsed.globalMetrics);
        if (parsed.manualSections) setManualSections(parsed.manualSections);
        if (parsed.scores) setScores(parsed.scores);
      } catch (e) {
        console.error("Failed to parse saved Part A data", e);
      }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ courseMetrics, globalMetrics, manualSections, scores })
      );
    }
  }, [courseMetrics, globalMetrics, manualSections, scores, STORAGE_KEY, isLoading]);

  // ── Always fetch the latest status from backend (independent of data cache) ──
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        const appraisal = (resp.data as any)?.data ?? resp.data;
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch { /* silently ignore – status defaults to Pending */ }
    };
    if (isInitialized) fetchStatus();
  }, [userId, isInitialized]);

  // Load from backend — GET /appraisal/:userId → read partA field
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        // Backend wraps: { success, data: IFacultyAppraisal, message }
        const appraisal = (resp.data as any)?.data ?? resp.data;
        const partA = appraisal?.partA;
        if (!partA) return;

        // Prefer existing local draft data when available
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (
              Object.keys(parsed.courseMetrics ?? {}).length > 0 ||
              parsed.globalMetrics?.eLearningInstances
            ) {
              return;
            }
          } catch { /* ignore */ }
        }

        // --- Map backend schema fields → local shapes ---
        const newManualSections: Record<PartAScoreKey, boolean> = {
          resultAnalysis: false, courseOutcome: false, eLearning: false,
          academicEngagement: false, teachingLoad: false, projectsGuided: false,
          studentFeedback: false, ptgMeetings: false,
        };

        const newGlobalMetrics: GlobalMetrics = {
          eLearningInstances: (partA.eLearningInstances ?? 0).toString(),
          weeklyLoadSem1: (partA.weeklyLoadSem1 ?? 0).toString(),
          weeklyLoadSem2: (partA.weeklyLoadSem2 ?? 0).toString(),
          phdScholar: partA.phdScholar ?? false,
          projectsGuided: (partA.projectsGuided ?? 0).toString(),
          ptgMeetings: (partA.ptgMeetings ?? 0).toString(),
        };

        const newCourseMetrics: Record<string, CourseData> = {};
        const loadedCourses: { id: string; code: string; semester: "Sem I" | "Sem II" }[] = [];

        // partA.courses is an ICourseMetric[] array
        if (Array.isArray(partA.courses)) {
          partA.courses.forEach((cData: any) => {
            const id = Math.random().toString(36).substr(2, 9);
            const semester = cData.semester === "Sem II" ? "Sem II" : "Sem I";
            loadedCourses.push({ id, code: cData.code ?? "", semester });
            newCourseMetrics[id] = {
              studentsAbove60: (cData.studentsAbove60 ?? 0).toString(),
              students50to59: (cData.students50to59 ?? 0).toString(),
              students40to49: (cData.students40to49 ?? 0).toString(),
              totalStudents: (cData.totalStudents ?? 0).toString(),
              coAttainment: (cData.coAttainment ?? 0).toString(),
              timelySubmissionCO: cData.timelySubmissionCO ?? false,
              studentsPresent: (cData.studentsPresent ?? 0).toString(),
              totalEnrolledStudents: (cData.totalEnrolledStudents ?? 0).toString(),
              feedbackPercentage: (cData.feedbackPercentage ?? 0).toString(),
            };
          });
        }

        const savedScores: ScoreState = {
          resultAnalysis: partA.sectionMarks?.resultAnalysis ?? 0,
          courseOutcome: partA.sectionMarks?.courseOutcome ?? 0,
          eLearning: partA.sectionMarks?.eLearning ?? 0,
          academicEngagement: partA.sectionMarks?.academicEngagement ?? 0,
          teachingLoad: partA.sectionMarks?.teachingLoad ?? 0,
          projectsGuided: partA.sectionMarks?.projectsGuided ?? 0,
          studentFeedback: partA.sectionMarks?.studentFeedback ?? 0,
          ptgMeetings: partA.sectionMarks?.ptgMeetings ?? 0,
        };

        // Seed localStorage before setting state
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            courseMetrics: newCourseMetrics,
            globalMetrics: newGlobalMetrics,
            manualSections: newManualSections,
            scores: savedScores,
          })
        );

        setManualSections(newManualSections);
        setGlobalMetrics(newGlobalMetrics);
        setScores(savedScores);
        if (loadedCourses.length > 0) {
          setCourses(loadedCourses);
          setCourseMetrics(newCourseMetrics);
        }
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch (e) {
        console.error("Fetch Part A failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isInitialized) fetchData();
  }, [userId, isInitialized, setCourses, STORAGE_KEY]);

  // Sync courseMetrics when courses change
  useEffect(() => {
    setCourseMetrics((prev) => {
      const next = { ...prev };
      let changed = false;
      courses.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = {
            studentsAbove60: "",
            students50to59: "",
            students40to49: "",
            totalStudents: "",
            coAttainment: "",
            timelySubmissionCO: false,
            studentsPresent: "",
            totalEnrolledStudents: "",
            feedbackPercentage: "",
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [courses]);

  // --- SCORE CALCULATIONS ---
  useEffect(() => {
    const activeCourseIds = courses.map((c) => c.id);
    const relevantMetrics = activeCourseIds.map((id) => courseMetrics[id]).filter(Boolean);

    setScores((prev) => {
      const next = { ...prev };

      if (!manualSections.resultAnalysis) {
        const total = relevantMetrics.reduce((sum, m) => {
          const t = Number(m.totalStudents) || 1;
          return sum + (10 * ((Number(m.studentsAbove60) || 0) * 5 + (Number(m.students50to59) || 0) * 4 + (Number(m.students40to49) || 0) * 3)) / t;
        }, 0);
        next.resultAnalysis = Math.min(PART_A_MAXES.resultAnalysis, total / Math.max(1, relevantMetrics.length));
      }

      if (!manualSections.courseOutcome) {
        const total = relevantMetrics.reduce((sum, m) => {
          return sum + (Number(m.coAttainment) || 0) * 30 / 100 + (m.timelySubmissionCO ? 20 : 0);
        }, 0);
        next.courseOutcome = Math.min(PART_A_MAXES.courseOutcome, total / Math.max(1, relevantMetrics.length));
      }

      if (!manualSections.eLearning) {
        next.eLearning = Math.min(PART_A_MAXES.eLearning, (Number(globalMetrics.eLearningInstances) || 0) * 10);
      }

      if (!manualSections.academicEngagement) {
        const total = relevantMetrics.reduce((sum, m) => {
          const enrolled = Number(m.totalEnrolledStudents) || 1;
          return sum + 50 * ((Number(m.studentsPresent) || 0) / enrolled);
        }, 0);
        next.academicEngagement = Math.min(PART_A_MAXES.academicEngagement, total / Math.max(1, relevantMetrics.length));
      }

      if (!manualSections.teachingLoad) {
        const minLoad = userDesignation === "Professor" ? 12 : userDesignation === "Associate Professor" ? 14 : 16;
        const avgLoad = ((Number(globalMetrics.weeklyLoadSem1) || 0) + (Number(globalMetrics.weeklyLoadSem2) || 0)) / 2;
        const E = globalMetrics.phdScholar ? 2 : 0;
        next.teachingLoad = Math.min(50, 50 * ((avgLoad + E) / minLoad));
      }

      if (!manualSections.projectsGuided) {
        next.projectsGuided = Math.min(PART_A_MAXES.projectsGuided, (Number(globalMetrics.projectsGuided) || 0) * 20);
      }

      if (!manualSections.studentFeedback) {
        const total = relevantMetrics.reduce((sum, m) => sum + (Number(m.feedbackPercentage) || 0), 0);
        next.studentFeedback = Math.min(PART_A_MAXES.studentFeedback, total / Math.max(1, relevantMetrics.length));
      }

      if (!manualSections.ptgMeetings) {
        next.ptgMeetings = Math.min(PART_A_MAXES.ptgMeetings, ((Number(globalMetrics.ptgMeetings) || 0) * 50) / 6);
      }

      return next;
    });
  }, [courseMetrics, globalMetrics, manualSections, courses, userDesignation]);

  // --- DERIVED TOTALS ---
  const rawSum = Object.values(scores).reduce((a, b) => a + b, 0);
  const factor = ROLE_FACTOR[userDesignation] ?? 1;
  const maxScore = ROLE_MAX[userDesignation] ?? 300;
  const finalScore = Math.min(maxScore, rawSum * factor).toFixed(1);

  // --- HELPERS ---
  const handleCourseMetricChange = (courseId: string, field: keyof CourseData, value: string | boolean) => {
    setCourseMetrics((prev) => ({ ...prev, [courseId]: { ...prev[courseId], [field]: value } }));
  };

  const toggleManual = (field: PartAScoreKey) => {
    setManualSections((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const setScore = (field: PartAScoreKey, value: number) => {
    setScores((prev) => ({ ...prev, [field]: Math.min(PART_A_MAXES[field], Math.max(0, value)) }));
  };

  // Progress
  const interactedCount = [
    Object.values(courseMetrics).some((m) => m.totalStudents),
    globalMetrics.eLearningInstances,
    globalMetrics.weeklyLoadSem1,
    globalMetrics.projectsGuided,
    globalMetrics.ptgMeetings,
  ].filter(Boolean).length;
  const progressPercent = (interactedCount / 5) * 100;

  // --- SUBMIT → PUT /appraisal/:userId/part-a ---
  const handleSubmit = async () => {
    if (formStatus !== APPRAISAL_STATUS.PEDING) {
      setShowStatusModal(true);
      return;
    }
    // Validate mandatory sections before submission
    const unfilledMandatory = SECTION_CONFIG.filter((s) => s.mandatory && scores[s.field] === 0);
    if (unfilledMandatory.length > 0) {
      setSubmitError(
        `Please fill the following mandatory sections before saving: ${unfilledMandatory.map((s) => s.name).join(", ")}`
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const activeCourseIds = courses.map((c) => c.id);

      // Build the courses array matching ICourseMetric schema
      const coursesPayload = activeCourseIds.map((id) => {
        const m = courseMetrics[id] ?? {};
        const c = courses.find((x) => x.id === id)!;
        const above60 = Number(m.studentsAbove60) || 0;
        const s50 = Number(m.students50to59) || 0;
        const s40 = Number(m.students40to49) || 0;
        const total = Number(m.totalStudents) || 1;
        const coAtt = Number(m.coAttainment) || 0;
        const present = Number(m.studentsPresent) || 0;
        const enrolled = Number(m.totalEnrolledStudents) || 1;
        const feedback = Number(m.feedbackPercentage) || 0;

        return {
          code: c.code ?? "",
          semester: c.semester ?? "Sem I",
          // Section 1 – Result Analysis
          studentsAbove60: above60,
          students50to59: s50,
          students40to49: s40,
          totalStudents: total,
          resultMarks: Math.min(PART_A_MAXES.resultAnalysis, (10 * (above60 * 5 + s50 * 4 + s40 * 3)) / total),
          // Section 2 – Course Outcome
          coAttainment: coAtt,
          timelySubmissionCO: m.timelySubmissionCO ?? false,
          coMarks: Math.min(PART_A_MAXES.courseOutcome, coAtt * 30 / 100 + (m.timelySubmissionCO ? 20 : 0)),
          // Section 4 – Academic Engagement
          studentsPresent: present,
          totalEnrolledStudents: enrolled,
          engagementMarks: Math.min(PART_A_MAXES.academicEngagement, 50 * (present / enrolled)),
          // Section 7 – Student Feedback
          feedbackPercentage: feedback,
          feedbackMarks: Math.min(PART_A_MAXES.studentFeedback, feedback),
        };
      });

      // Shape must exactly match partA in the Mongoose schema
      const payload = {
        courses: coursesPayload,
        eLearningInstances: Number(globalMetrics.eLearningInstances) || 0,
        weeklyLoadSem1: Number(globalMetrics.weeklyLoadSem1) || 0,
        weeklyLoadSem2: Number(globalMetrics.weeklyLoadSem2) || 0,
        phdScholar: globalMetrics.phdScholar,
        projectsGuided: Number(globalMetrics.projectsGuided) || 0,
        ptgMeetings: Number(globalMetrics.ptgMeetings) || 0,
        sectionMarks: {
          resultAnalysis: scores.resultAnalysis,
          courseOutcome: scores.courseOutcome,
          eLearning: scores.eLearning,
          academicEngagement: scores.academicEngagement,
          teachingLoad: scores.teachingLoad,
          projectsGuided: scores.projectsGuided,
          studentFeedback: scores.studentFeedback,
          ptgMeetings: scores.ptgMeetings,
        },
        totalClaimed: Number(finalScore),
        totalVerified: 0,
      };

      await axios.put(`${BACKEND}/appraisal/${userId}/part-a`, payload, { withCredentials: true });
      setShowSuccessModal(true);
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>;
      setSubmitError(err.response?.data?.message ?? (err as Error).message ?? "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader message="Loading Academic Performance..." />;
  const locked = formStatus !== APPRAISAL_STATUS.PEDING;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-[1.15rem]" style={{ lineHeight: 1.7 }}>
      <FormProgressBar progress={progressPercent} label="Part A Completion" />
      <CourseManagementHeader />

      {ACADEMIC_SECTIONS.map(({ title, field, formula }) => (
        <SectionCard key={field} title={title}>
          <div className="space-y-5">
            {/* Guideline */}
            <div className="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-100 shadow-sm">
              <p className="text-base font-extrabold text-indigo-700 uppercase tracking-widest mb-2 opacity-90">
                Computation Guidelines
              </p>
              <p className="text-lg text-indigo-900 leading-relaxed italic font-semibold">
                {formula}
              </p>
            </div>

            {/* Manual override toggle */}
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={manualSections[field]}
                disabled={locked}
                onChange={() => !locked && toggleManual(field)}
                className="w-5 h-5 rounded border-indigo-300 text-indigo-700 focus:ring-indigo-400 disabled:opacity-50"
              />
              <span className="text-base font-bold text-indigo-800 uppercase tracking-tight">
                Enter marks manually
              </span>
            </label>

            {/* Per-course inputs */}
            {(field === "resultAnalysis" || field === "courseOutcome" || field === "academicEngagement") &&
              !manualSections[field] &&
              courses.map((c) => (
                <div key={c.id} className="p-5 rounded-xl border-2 border-indigo-100 bg-indigo-50 space-y-4">
                  <span className="text-base font-black text-indigo-800 uppercase tracking-widest bg-indigo-100 px-3 py-1 rounded border border-indigo-200">
                    Subject: {c.code || "Unnamed"}
                  </span>

                  {field === "resultAnalysis" && (
                    <div className="grid grid-cols-2 gap-4">
                      <MetricInputField disabled={locked} label="Students > 60%" value={courseMetrics[c.id]?.studentsAbove60} onChange={(v) => handleCourseMetricChange(c.id, "studentsAbove60", v)} />
                      <MetricInputField disabled={locked} label="Students 50-59%" value={courseMetrics[c.id]?.students50to59} onChange={(v) => handleCourseMetricChange(c.id, "students50to59", v)} />
                      <MetricInputField disabled={locked} label="Students 40-49%" value={courseMetrics[c.id]?.students40to49} onChange={(v) => handleCourseMetricChange(c.id, "students40to49", v)} />
                      <MetricInputField disabled={locked} label="Total Students" value={courseMetrics[c.id]?.totalStudents} onChange={(v) => handleCourseMetricChange(c.id, "totalStudents", v)} />
                    </div>
                  )}

                  {field === "courseOutcome" && (
                    <div className="space-y-4">
                      <MetricInputField disabled={locked} label="CO Attainment (%)" value={courseMetrics[c.id]?.coAttainment} onChange={(v) => handleCourseMetricChange(c.id, "coAttainment", v)} />
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={courseMetrics[c.id]?.timelySubmissionCO ?? false}
                          onChange={(e) => handleCourseMetricChange(c.id, "timelySubmissionCO", e.target.checked)}
                          className="w-5 h-5 rounded border-indigo-300 text-indigo-700 disabled:opacity-50"
                        />
                        <span className="text-base font-bold text-indigo-900 uppercase">Timely CO Submission</span>
                      </label>
                    </div>
                  )}

                  {field === "academicEngagement" && (
                    <div className="grid grid-cols-2 gap-4">
                      <MetricInputField disabled={locked} label="Students Present" value={courseMetrics[c.id]?.studentsPresent} onChange={(v) => handleCourseMetricChange(c.id, "studentsPresent", v)} />
                      <MetricInputField disabled={locked} label="Total Enrolled Students" value={courseMetrics[c.id]?.totalEnrolledStudents} onChange={(v) => handleCourseMetricChange(c.id, "totalEnrolledStudents", v)} />
                    </div>
                  )}
                </div>
              ))}

            {/* Global inputs */}
            {field === "eLearning" && !manualSections[field] && (
              <MetricInputField
                label="E-Learning Instances Developed"
                value={globalMetrics.eLearningInstances}
                onChange={(v) => setGlobalMetrics((p) => ({ ...p, eLearningInstances: v }))}
                className="max-w-xs"
                placeholder="Enter count"
              />
            )}

            {field === "teachingLoad" && !manualSections[field] && (
              <div className="space-y-5 max-w-lg">
                <div className="grid grid-cols-2 gap-5">
                  <MetricInputField label="Weekly Load Sem I" value={globalMetrics.weeklyLoadSem1} onChange={(v) => setGlobalMetrics((p) => ({ ...p, weeklyLoadSem1: v }))} placeholder="e.g. 18 hours/week" />
                  <MetricInputField label="Weekly Load Sem II" value={globalMetrics.weeklyLoadSem2} onChange={(v) => setGlobalMetrics((p) => ({ ...p, weeklyLoadSem2: v }))} placeholder="e.g. 16 hours/week" />
                </div>
                <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={globalMetrics.phdScholar}
                    disabled={locked}
                    onChange={(e) => setGlobalMetrics((p) => ({ ...p, phdScholar: e.target.checked }))}
                    className="w-6 h-6 rounded border-indigo-300 text-indigo-700 focus:ring-indigo-400 disabled:opacity-50"
                  />
                  <div>
                    <p className="text-sm text-indigo-700 opacity-90">(Are You Ph.D Supervisor Having Scholars Enrolled at PCCOE Research Center)</p>
                  </div>
                </label>
              </div>
            )}

            {field === "projectsGuided" && !manualSections[field] && (
              <MetricInputField
                label="Number of Projects/Dissertations Guided"
                value={globalMetrics.projectsGuided}
                onChange={(v) => setGlobalMetrics((p) => ({ ...p, projectsGuided: v }))}
                className="max-w-xs"
                placeholder="Enter count"
              />
            )}

            {field === "studentFeedback" && !manualSections[field] &&
              courses.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-xl border-2 border-indigo-100 bg-indigo-50 flex items-center justify-between"
                >
                  <span className="text-base font-black text-indigo-800 uppercase tracking-widest bg-indigo-100 px-3 py-1 rounded border border-indigo-200">
                    Subject: {c.code || "Unnamed"}
                  </span>
                  <MetricInputField
                    label="Feedback (%)"
                    value={courseMetrics[c.id]?.feedbackPercentage}
                    onChange={(v) => handleCourseMetricChange(c.id, "feedbackPercentage", v)}
                    className="w-40"
                    placeholder="Enter feedback %"
                  />
                </div>
              ))}

            {field === "ptgMeetings" && !manualSections[field] && (
              <MetricInputField
                label="Number of PTG Meetings Conducted"
                value={globalMetrics.ptgMeetings}
                onChange={(v) => setGlobalMetrics((p) => ({ ...p, ptgMeetings: v }))}
                className="max-w-xs"
                placeholder="Enter number of meetings"
              />
            )}

            {/* Section score */}
            <div className="flex items-center justify-between px-2 pt-3 border-t-2 border-indigo-100">
              <span className="text-indigo-900 text-lg font-black uppercase tracking-widest opacity-90">
                Calculated Mark (Section Total)
              </span>
              {manualSections[field] ? (
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={PART_A_MAXES[field]}
                    disabled={locked}
                    aria-label={`Manual score for ${title}`}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => e.key === "-" && e.preventDefault()}
                    value={scores[field] === 0 ? "" : scores[field]}
                    onChange={(e) => setScore(field, Number(e.target.value))}
                    placeholder="0"
                    className="w-24 rounded-lg border-2 border-indigo-300 bg-white px-4 py-2 text-lg text-right font-black text-indigo-900 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-700 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm disabled:opacity-60"
                  />
                  <span className="text-base font-bold text-indigo-700 tabular-nums uppercase">
                    / {PART_A_MAXES[field]}
                  </span>
                </div>
              ) : (
                <span className="font-black text-indigo-900 text-lg tabular-nums">
                  {scores[field].toFixed(1)}
                  <span className="font-bold text-indigo-700 text-lg uppercase ml-2 tracking-tighter opacity-80">
                    / {PART_A_MAXES[field]}
                  </span>
                </span>
              )}
            </div>
            {/* Score After Verification — hidden until enabled */}
            <div className="hidden">
              <div className="flex items-center justify-between px-2 pt-2 border-t border-green-100">
                <span className="text-green-700 text-sm font-black uppercase tracking-widest">
                  Score After Verification
                </span>
                <span className="font-black text-green-700 text-sm tabular-nums px-3 py-1 rounded border border-green-200 bg-green-50">
                  Pending
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      ))}

      {/* Final Score Table */}
      <SectionCard title="Final Score Calculation">
        <div className="overflow-hidden rounded-xl border-2 border-indigo-200">
          <table className="min-w-full divide-y divide-indigo-200 text-base">
            <thead className="bg-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left font-extrabold text-indigo-700 uppercase tracking-widest text-base">Component</th>
                <th className="px-6 py-3 text-right font-extrabold text-indigo-700 uppercase tracking-widest text-base">Score</th>
                <th className="px-6 py-3 text-right font-extrabold text-indigo-700 uppercase tracking-widest text-base">Maximum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100 bg-white">
              <tr>
                <td className="px-6 py-4 text-indigo-900 font-bold uppercase text-base tracking-tight">Raw Sum of All Sections</td>
                <td className="px-6 py-4 text-right text-indigo-900 tabular-nums font-extrabold">{rawSum.toFixed(1)}</td>
                <td className="px-6 py-4 text-right text-indigo-700 tabular-nums font-bold">440.0</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-indigo-800 italic flex items-center gap-3 text-base uppercase tracking-tight">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
                  Role Factor ({userDesignation})
                </td>
                <td className="px-6 py-4 text-right text-indigo-900 tabular-nums font-extrabold">{factor.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-indigo-700 tabular-nums font-bold">—</td>
              </tr>
              <tr className="bg-indigo-100 font-extrabold border-t-2 border-indigo-200">
                <td className="px-6 py-5 text-indigo-800 uppercase tracking-widest font-black">Final Adjusted Score</td>
                <td className="px-6 py-5 text-right text-indigo-700 tabular-nums text-2xl font-black underline decoration-2 decoration-indigo-300 underline-offset-4">{finalScore}</td>
                <td className="px-6 py-5 text-right text-indigo-700 tabular-nums text-2xl font-black">{maxScore}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex flex-col items-end gap-3 pt-3">
        {submitError && (
          <p className="text-base font-extrabold text-destructive uppercase tracking-tight">
            Error: {submitError}
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || locked}
          aria-label="Save Performance Data"
          className="min-w-[260px] shadow-lg shadow-indigo-200 uppercase tracking-widest text-base font-black bg-indigo-700 hover:bg-indigo-800 text-white transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </div>
          ) : (
            "Save Performance"
          )}
        </Button>
      </div>

      {showStatusModal && (
        <FormLockedModal formStatus={formStatus} onClose={() => setShowStatusModal(false)} />
      )}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Performance data saved successfully!"
      />
    </div>
  );
}

export default PartAAcademicInvolvement;
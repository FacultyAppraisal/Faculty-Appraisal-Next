"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PART_B_ROLE_MAX, PART_B_SECTION_MAXES, PART_B_WEIGHTS } from "@/lib/forms/constants";
import { DesignationValue, APPRAISAL_STATUS } from "@/lib/constants";
import SectionCard from "../shared/SectionCard";
import ScoreCard from "../shared/ScoreCard";
import MetricField from "../shared/MetricField";
import FormProgressBar from "../shared/FormProgressBar";
import FormLockedModal from "../shared/FormLockedModal";
import SuccessModal from "../shared/SuccessModal";
import Loader from "@/components/loader";
import axios, { AxiosError } from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// --- CONSTANTS ---
const FORMULAS = {
  journal: "Marks: SCI=100, ESCI=50, Scopus=50, UGC=10, Other=5 (No limit)",
  conference: "Marks: Scopus/WoS=30, Other=5 (Max 180)",
  bookChapter: "Marks: Scopus/WoS=30, Other=5 (Max 150)",
  bookAuthored: "Marks: Intl Indexed=100, Intl/Natl Non-Indexed=30, Local=10 (Max 200)",
  citations: "Marks: WoS/Scopus=1 pt/citation, Scholar=0.33 pt/citation (Max 50)",
  copyrightIndiv: "Marks: Registered=5, Granted=15 (Max 30)",
  copyrightInst: "Marks: Registered=10, Granted=30 (No limit)",
  patentIndiv: "Marks: Reg=15, Pub=30, Granted=50, Comm=100 (Max 100)",
  patentInst: "Marks: Reg=30, Pub=60, Granted=100, Comm=200 (No limit)",
  grantsResearch: "Marks: 10 per 2 Lakh (No limit)",
  revenueTraining: "Marks: 5 per 10k (Max 40)",
  grantsNonResearch: "Marks: 5 per 10k (Max 40)",
  product: "Marks: Comm=100, Developed=40, POC=10 (Max 100)",
  startup: "Marks: Rev>50k=100, Fund>5L=100, Prod=40, POC=10, Reg=5 (No limit)",
  award: "Marks: Intl=30, Govt=20, Natl=5, Intl Fel=50, Natl Fel=30 (Max 50)",
  interaction: "Marks: MoU=10, Collab=20 (No limit)",
  placement: "Marks: Offer=10 (No limit)",
};

// --- SECTION MANDATORY CONFIG ---
// Defines which sections of Part B are mandatory for form submission.
// Research contributions are optional – faculty fill what is applicable.
const SECTION_CONFIG: { name: string; key: keyof ResearchFormData; mandatory: boolean }[] = [
  { name: "Papers Published in Quality Journal", key: "journal", mandatory: false },
  { name: "Papers Published in Conference Proceedings", key: "conference", mandatory: false },
  { name: "Book Chapters Published", key: "bookChapter", mandatory: false },
  { name: "Books Authored / Edited", key: "books", mandatory: false },
  { name: "Citations", key: "citations", mandatory: false },
  { name: "Copyrights (Individual)", key: "copyrightIndiv", mandatory: false },
  { name: "Copyrights (Institution)", key: "copyrightInst", mandatory: false },
  { name: "Patents (Individual)", key: "patentIndiv", mandatory: false },
  { name: "Patents (Institution)", key: "patentInst", mandatory: false },
  { name: "Research / Sponsored Grants", key: "grantResearch", mandatory: false },
  { name: "Revenue from Training / Consultancy", key: "revenueTraining", mandatory: false },
  { name: "Non-Research Grants", key: "grantNonResearch", mandatory: false },
  { name: "Products / Technology Developed", key: "product", mandatory: false },
  { name: "Startup", key: "startup", mandatory: false },
  { name: "Awards & Fellowships", key: "award", mandatory: false },
  { name: "Industry-Academia Interaction", key: "interaction", mandatory: false },
  { name: "Placement Activity", key: "placement", mandatory: false },
];

// --- TYPES ---
interface MetricData {
  value: number;
  proof: string;
  verified: number | undefined;
}

interface ResearchFormData {
  journal: { sci: MetricData; esci: MetricData; scopus: MetricData; ugc: MetricData; other: MetricData };
  conference: { scopus: MetricData; other: MetricData };
  bookChapter: { scopus: MetricData; other: MetricData };
  books: { intlIn: MetricData; intlNatl: MetricData; local: MetricData };
  citations: { wos: MetricData; scopus: MetricData; scholar: MetricData };
  copyrightIndiv: { registered: MetricData; granted: MetricData };
  copyrightInst: { registered: MetricData; granted: MetricData };
  patentIndiv: { registered: MetricData; published: MetricData; granted: MetricData; commercialized: MetricData };
  patentInst: { registered: MetricData; published: MetricData; granted: MetricData; commercialized: MetricData };
  grantResearch: { amount: MetricData };
  revenueTraining: { amount: MetricData };
  grantNonResearch: { amount: MetricData };
  product: { commercialized: MetricData; developed: MetricData; poc: MetricData };
  startup: { rev50k: MetricData; fund5L: MetricData; product: MetricData; poc: MetricData; registered: MetricData };
  award: { intl: MetricData; govt: MetricData; national: MetricData; intlFellow: MetricData; natlFellow: MetricData };
  interaction: { mou: MetricData; collab: MetricData };
  placement: { offer: MetricData };
}

interface PartBResearchProps {
  userId: string;
  userDesignation: DesignationValue;
}

// --- HELPERS ---
const emptyMetric = (): MetricData => ({ value: 0, proof: "", verified: undefined });

/** Map IVerifiedMark schema node → frontend MetricData */
const fromMark = (node: any): MetricData => ({
  value: node?.count ?? 0,
  proof: node?.proof ?? "",
  verified: node?.verified ?? undefined,
});

/** Map frontend MetricData → IVerifiedMark schema shape */
const toMark = (m: MetricData) => ({
  count: m.value,
  proof: m.proof,
  claimed: m.value,
});

const TransparencyGuideline = ({ formula }: { formula: string }) => (
  <div className="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-100 shadow-sm mb-5">
    <p className="text-base font-extrabold text-indigo-700 uppercase tracking-widest mb-2 opacity-90">
      Computation Guidelines
    </p>
    <p className="text-lg text-indigo-900 leading-relaxed italic font-semibold">{formula}</p>
  </div>
);

const DriveLinkNote = () => (
  <div className="p-4 mb-5 rounded-xl bg-indigo-50 border-2 border-indigo-100 shadow-md flex items-start gap-4">
    <div className="bg-indigo-200 p-2.5 rounded-lg text-indigo-800 mt-1 flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
    <p className="text-base text-indigo-900 leading-relaxed font-medium">
      <span className="font-extrabold uppercase tracking-wider text-indigo-800 block mb-1">Drive Link Instructions</span>
      Upload all documents to a{" "}
      <span className="underline decoration-indigo-300 font-bold">single Google Drive folder</span> and paste that folder link in the proof fields. Ensure access is set to{" "}
      <span className="italic">"Anyone with the link"</span>.
    </p>
  </div>
);

const INITIAL_FORM_DATA: ResearchFormData = {
  journal: { sci: emptyMetric(), esci: emptyMetric(), scopus: emptyMetric(), ugc: emptyMetric(), other: emptyMetric() },
  conference: { scopus: emptyMetric(), other: emptyMetric() },
  bookChapter: { scopus: emptyMetric(), other: emptyMetric() },
  books: { intlIn: emptyMetric(), intlNatl: emptyMetric(), local: emptyMetric() },
  citations: { wos: emptyMetric(), scopus: emptyMetric(), scholar: emptyMetric() },
  copyrightIndiv: { registered: emptyMetric(), granted: emptyMetric() },
  copyrightInst: { registered: emptyMetric(), granted: emptyMetric() },
  patentIndiv: { registered: emptyMetric(), published: emptyMetric(), granted: emptyMetric(), commercialized: emptyMetric() },
  patentInst: { registered: emptyMetric(), published: emptyMetric(), granted: emptyMetric(), commercialized: emptyMetric() },
  grantResearch: { amount: emptyMetric() },
  revenueTraining: { amount: emptyMetric() },
  grantNonResearch: { amount: emptyMetric() },
  product: { commercialized: emptyMetric(), developed: emptyMetric(), poc: emptyMetric() },
  startup: { rev50k: emptyMetric(), fund5L: emptyMetric(), product: emptyMetric(), poc: emptyMetric(), registered: emptyMetric() },
  award: { intl: emptyMetric(), govt: emptyMetric(), national: emptyMetric(), intlFellow: emptyMetric(), natlFellow: emptyMetric() },
  interaction: { mou: emptyMetric(), collab: emptyMetric() },
  placement: { offer: emptyMetric() },
};

// --- COMPONENT ---
function PartBResearch({ userId, userDesignation }: PartBResearchProps) {
  const [formData, setFormData] = useState<ResearchFormData>(INITIAL_FORM_DATA);
  const [verifiedTotalScore, setVerifiedTotalScore] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(APPRAISAL_STATUS.PEDING);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const STORAGE_KEY = `partB_data_${userId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) setFormData(parsed);
      } catch (e) {
        console.error("Failed to parse saved Part B data", e);
      }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData, STORAGE_KEY, isLoading]); // STORAGE_KEY already in deps — correct

  // Score Calculations
  const scores = {
    journal: Math.min(PART_B_SECTION_MAXES.qualityJournal,
      formData.journal.sci.value * PART_B_WEIGHTS.journal.sci +
      formData.journal.esci.value * PART_B_WEIGHTS.journal.esci +
      formData.journal.scopus.value * PART_B_WEIGHTS.journal.scopus +
      formData.journal.ugc.value * PART_B_WEIGHTS.journal.ugc +
      formData.journal.other.value * PART_B_WEIGHTS.journal.other),
    conference: Math.min(PART_B_SECTION_MAXES.conference,
      formData.conference.scopus.value * PART_B_WEIGHTS.conference.scopus +
      formData.conference.other.value * PART_B_WEIGHTS.conference.other),
    bookChapter: Math.min(PART_B_SECTION_MAXES.bookChapter,
      formData.bookChapter.scopus.value * PART_B_WEIGHTS.bookChapter.scopus +
      formData.bookChapter.other.value * PART_B_WEIGHTS.bookChapter.other),
    books: Math.min(PART_B_SECTION_MAXES.bookAuthored,
      formData.books.intlIn.value * PART_B_WEIGHTS.bookAuthored.intlIndexed +
      formData.books.intlNatl.value * PART_B_WEIGHTS.bookAuthored.intlNatlNonIndexed +
      formData.books.local.value * PART_B_WEIGHTS.bookAuthored.local),
    citations: Math.min(PART_B_SECTION_MAXES.citations,
      formData.citations.wos.value * PART_B_WEIGHTS.citations.wos +
      formData.citations.scopus.value * PART_B_WEIGHTS.citations.scopus +
      formData.citations.scholar.value * PART_B_WEIGHTS.citations.scholar),
    copyrightIndiv: Math.min(PART_B_SECTION_MAXES.copyrightIndiv,
      formData.copyrightIndiv.registered.value * PART_B_WEIGHTS.copyrightIndiv.registered +
      formData.copyrightIndiv.granted.value * PART_B_WEIGHTS.copyrightIndiv.granted),
    copyrightInst: Math.min(PART_B_SECTION_MAXES.copyrightInst,
      formData.copyrightInst.registered.value * PART_B_WEIGHTS.copyrightInst.registered +
      formData.copyrightInst.granted.value * PART_B_WEIGHTS.copyrightInst.granted),
    patentIndiv: Math.min(PART_B_SECTION_MAXES.patentIndiv,
      formData.patentIndiv.registered.value * PART_B_WEIGHTS.patentIndiv.registered +
      formData.patentIndiv.published.value * PART_B_WEIGHTS.patentIndiv.published +
      formData.patentIndiv.granted.value * PART_B_WEIGHTS.patentIndiv.granted +
      formData.patentIndiv.commercialized.value * PART_B_WEIGHTS.patentIndiv.commercialized),
    patentInst: Math.min(PART_B_SECTION_MAXES.patentInst,
      formData.patentInst.registered.value * PART_B_WEIGHTS.patentInst.registered +
      formData.patentInst.published.value * PART_B_WEIGHTS.patentInst.published +
      formData.patentInst.granted.value * PART_B_WEIGHTS.patentInst.granted +
      formData.patentInst.commercialized.value * PART_B_WEIGHTS.patentInst.commercialized),
    grantResearch: Math.min(PART_B_SECTION_MAXES.grantsResearch,
      formData.grantResearch.amount.value * PART_B_WEIGHTS.grantsResearch),
    revenueTraining: Math.min(PART_B_SECTION_MAXES.revenueTraining,
      formData.revenueTraining.amount.value * PART_B_WEIGHTS.revenueTraining),
    grantNonResearch: Math.min(PART_B_SECTION_MAXES.grantsNonResearch,
      formData.grantNonResearch.amount.value * PART_B_WEIGHTS.grantsNonResearch),
    product: Math.min(PART_B_SECTION_MAXES.product,
      formData.product.commercialized.value * PART_B_WEIGHTS.product.commercialized +
      formData.product.developed.value * PART_B_WEIGHTS.product.developed +
      formData.product.poc.value * PART_B_WEIGHTS.product.poc),
    startup: Math.min(PART_B_SECTION_MAXES.startup,
      formData.startup.rev50k.value * PART_B_WEIGHTS.startup.rev50k +
      formData.startup.fund5L.value * PART_B_WEIGHTS.startup.fund5L +
      formData.startup.product.value * PART_B_WEIGHTS.startup.product +
      formData.startup.poc.value * PART_B_WEIGHTS.startup.poc +
      formData.startup.registered.value * PART_B_WEIGHTS.startup.registered),
    award: Math.min(PART_B_SECTION_MAXES.award,
      formData.award.intl.value * PART_B_WEIGHTS.award.intl +
      formData.award.govt.value * PART_B_WEIGHTS.award.govt +
      formData.award.national.value * PART_B_WEIGHTS.award.national +
      formData.award.intlFellow.value * PART_B_WEIGHTS.award.intlFellow +
      formData.award.natlFellow.value * PART_B_WEIGHTS.award.natlFellow),
    interaction: Math.min(PART_B_SECTION_MAXES.interaction,
      formData.interaction.mou.value * PART_B_WEIGHTS.interaction.mou +
      formData.interaction.collab.value * PART_B_WEIGHTS.interaction.collab),
    placement: Math.min(PART_B_SECTION_MAXES.placement,
      formData.placement.offer.value * PART_B_WEIGHTS.placement.offer),
  };

  const maxTotal = PART_B_ROLE_MAX[userDesignation] ?? 300;
  const totalScore = Math.min(maxTotal, Object.values(scores).reduce((a, b) => a + b, 0));


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

  // Load from backend — GET /appraisal/:userId → read partB field
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ── Prefer cache: if localStorage already has real data, skip fetch ──
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const hasData = Object.values(parsed ?? {}).some((section: any) =>
              section && typeof section === "object" &&
              Object.values(section).some((m: any) => m && (m.value > 0 || m.proof))
            );
            if (hasData) {
              setIsLoading(false);
              return;
            }
          } catch { /* ignore parse errors, proceed to fetch */ }
        }

        const resp = await axios.get(`${BACKEND}/appraisal/${userId}`, { withCredentials: true });
        // Backend wraps: { success, data: IFacultyAppraisal, message }
        const appraisal = resp.data?.data;
        const d = appraisal?.partB;
        if (d) {
          // Map from schema shape (papers.sci, conferences.scopus, etc.) → local state
          const newFormData: ResearchFormData = {
            journal: {
              sci: fromMark(d.papers?.sci),
              esci: fromMark(d.papers?.esci),
              scopus: fromMark(d.papers?.scopus),
              ugc: fromMark(d.papers?.ugc),
              other: fromMark(d.papers?.other),
            },
            conference: {
              scopus: fromMark(d.conferences?.scopus),
              other: fromMark(d.conferences?.other),
            },
            bookChapter: {
              scopus: fromMark(d.bookChapters?.scopus),
              other: fromMark(d.bookChapters?.other),
            },
            books: {
              intlIn: fromMark(d.books?.intlIndexed),
              intlNatl: fromMark(d.books?.intlNational),
              local: fromMark(d.books?.local),
            },
            citations: {
              wos: fromMark(d.citations?.wos),
              scopus: fromMark(d.citations?.scopus),
              scholar: fromMark(d.citations?.googleScholar),
            },
            copyrightIndiv: {
              registered: fromMark(d.copyrights?.individualRegistered),
              granted: fromMark(d.copyrights?.individualGranted),
            },
            copyrightInst: {
              registered: fromMark(d.copyrights?.instituteRegistered),
              granted: fromMark(d.copyrights?.instituteGranted),
            },
            patentIndiv: {
              registered: fromMark(d.patents?.individualRegistered),
              published: fromMark(d.patents?.individualPublished),
              granted: fromMark(d.patents?.individualGranted),
              commercialized: fromMark(d.patents?.individualCommercialized),
            },
            patentInst: {
              registered: fromMark(d.patents?.instituteRegistered),
              published: fromMark(d.patents?.institutePublished),
              granted: fromMark(d.patents?.instituteGranted),
              commercialized: fromMark(d.patents?.instituteCommercialized),
            },
            grantResearch: { amount: fromMark(d.grants?.research) },
            revenueTraining: { amount: fromMark(d.revenueTraining) },
            grantNonResearch: { amount: fromMark(d.grants?.nonResearch) },
            product: {
              commercialized: fromMark(d.products?.commercialized),
              developed: fromMark(d.products?.developed),
              poc: fromMark(d.products?.poc),
            },
            startup: {
              rev50k: fromMark(d.startup?.revenue),
              fund5L: fromMark(d.startup?.funding),
              product: fromMark(d.startup?.product),
              poc: fromMark(d.startup?.poc),
              registered: fromMark(d.startup?.registered),
            },
            award: {
              intl: fromMark(d.awards?.international),
              govt: fromMark(d.awards?.government),
              national: fromMark(d.awards?.national),
              intlFellow: fromMark(d.awards?.intlFellowship),
              natlFellow: fromMark(d.awards?.nationalFellowship),
            },
            interaction: {
              mou: fromMark(d.industryInteraction?.activeMou),
              collab: fromMark(d.industryInteraction?.collaboration),
            },
            placement: { offer: fromMark(d.placement) },
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(newFormData));
          setFormData(newFormData);
          setVerifiedTotalScore(d?.totalVerified ?? undefined);
        }
        setFormStatus(appraisal?.status ?? APPRAISAL_STATUS.PEDING);
      } catch (err) {
        console.error("Fetch Part B failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId, STORAGE_KEY]);

  const updateField = (
    section: keyof ResearchFormData,
    field: string,
    updates: Partial<MetricData>
  ) => {
    setFormData((prev) => {
      const secData = prev[section] as any;
      return {
        ...prev,
        [section]: { ...secData, [field]: { ...secData[field], ...updates } },
      };
    });
  };


  // PUT /appraisal/:userId/part-b
  const handleSubmit = async () => {
    if (formStatus !== APPRAISAL_STATUS.PEDING) {
      setShowStatusModal(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Shape matches the partB Mongoose sub-schema exactly
      const payload = {
        papers: {
          sci: toMark(formData.journal.sci),
          esci: toMark(formData.journal.esci),
          scopus: toMark(formData.journal.scopus),
          ugc: toMark(formData.journal.ugc),
          other: toMark(formData.journal.other),
        },
        conferences: {
          scopus: toMark(formData.conference.scopus),
          other: toMark(formData.conference.other),
        },
        bookChapters: {
          scopus: toMark(formData.bookChapter.scopus),
          other: toMark(formData.bookChapter.other),
        },
        books: {
          intlIndexed: toMark(formData.books.intlIn),
          intlNational: toMark(formData.books.intlNatl),
          local: toMark(formData.books.local),
        },
        citations: {
          wos: toMark(formData.citations.wos),
          scopus: toMark(formData.citations.scopus),
          googleScholar: toMark(formData.citations.scholar),
        },
        copyrights: {
          individualRegistered: toMark(formData.copyrightIndiv.registered),
          individualGranted: toMark(formData.copyrightIndiv.granted),
          instituteRegistered: toMark(formData.copyrightInst.registered),
          instituteGranted: toMark(formData.copyrightInst.granted),
        },
        patents: {
          individualRegistered: toMark(formData.patentIndiv.registered),
          individualPublished: toMark(formData.patentIndiv.published),
          individualGranted: toMark(formData.patentIndiv.granted),
          individualCommercialized: toMark(formData.patentIndiv.commercialized),
          instituteRegistered: toMark(formData.patentInst.registered),
          institutePublished: toMark(formData.patentInst.published),
          instituteGranted: toMark(formData.patentInst.granted),
          instituteCommercialized: toMark(formData.patentInst.commercialized),
        },
        grants: {
          research: toMark(formData.grantResearch.amount),
          nonResearch: toMark(formData.grantNonResearch.amount),
        },
        revenueTraining: toMark(formData.revenueTraining.amount),
        products: {
          commercialized: toMark(formData.product.commercialized),
          developed: toMark(formData.product.developed),
          poc: toMark(formData.product.poc),
        },
        startup: {
          revenue: toMark(formData.startup.rev50k),
          funding: toMark(formData.startup.fund5L),
          product: toMark(formData.startup.product),
          poc: toMark(formData.startup.poc),
          registered: toMark(formData.startup.registered),
        },
        awards: {
          international: toMark(formData.award.intl),
          government: toMark(formData.award.govt),
          national: toMark(formData.award.national),
          intlFellowship: toMark(formData.award.intlFellow),
          nationalFellowship: toMark(formData.award.natlFellow),
        },
        industryInteraction: {
          activeMou: toMark(formData.interaction.mou),
          collaboration: toMark(formData.interaction.collab),
        },
        placement: toMark(formData.placement.offer),
        totalClaimed: totalScore,
      };
      await axios.put(`${BACKEND}/appraisal/${userId}/part-b`, payload, { withCredentials: true });
      setShowSuccessModal(true);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setSubmitError(axErr.response?.data?.message ?? axErr.message ?? "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const interactedCount = Object.values(formData).reduce(
    (acc, sec) =>
      acc +
      Object.values(sec).filter(
        (m: any) => (m.value && m.value > 0) || (m.proof && m.proof.trim().length > 0)
      ).length,
    0
  );
  const totalFields = Object.values(formData).reduce(
    (acc, sec) => acc + Object.keys(sec).length,
    0
  );
  const progressPercent = (interactedCount / totalFields) * 100;


  if (isLoading) return <Loader message="Loading research data..." />;
  const locked = formStatus !== APPRAISAL_STATUS.PEDING;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-[1.15rem]" style={{ lineHeight: 1.7 }}>
      <FormProgressBar progress={progressPercent} label="Part B Completion" />

      {/* 1. Journal Publications */}
      <SectionCard title="1. Quality Journal Publications">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.journal} />
        {(["sci", "esci", "scopus", "ugc", "other"] as const).map((key) => (
          <MetricField
            key={key}
            label={`${key.toUpperCase()} Publications`}
            name={`journal.${key}`}
            value={formData.journal[key].value}
            onChange={(e) => updateField("journal", key, { value: Number(e.target.value) })}
            proofValue={formData.journal[key].proof}
            onProofChange={(e) => updateField("journal", key, { proof: e.target.value })}
            verifiedScore={formData.journal[key].verified}
            disabled={locked}
          />
        ))}
        <ScoreCard label="Journal Score" score={scores.journal} total="No limit" />
      </SectionCard>

      {/* 2. Conference Papers */}
      <SectionCard title="2. Conference Papers">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.conference} />
        {(["scopus", "other"] as const).map((key) => (
          <MetricField
            key={key}
            label={key === "scopus" ? "Scopus/WoS Conference Papers (30 marks each)" : "Other Conference Papers (5 marks each)"}
            name={`conference.${key}`}
            value={formData.conference[key].value}
            onChange={(e) => updateField("conference", key, { value: Number(e.target.value) })}
            proofValue={formData.conference[key].proof}
            onProofChange={(e) => updateField("conference", key, { proof: e.target.value })}
            verifiedScore={formData.conference[key].verified}
            disabled={locked}
          />
        ))}
        <ScoreCard label="Conference Score" score={scores.conference} total={180} />
      </SectionCard>

      {/* 3. Book Chapters */}
      <SectionCard title="3. Book Chapters">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.bookChapter} />
        {(["scopus", "other"] as const).map((key) => (
          <MetricField
            key={key}
            label={key === "scopus" ? "Scopus/WoS Book Chapters (30 marks each)" : "Other Book Chapters (5 marks each)"}
            name={`bookChapter.${key}`}
            value={formData.bookChapter[key].value}
            onChange={(e) => updateField("bookChapter", key, { value: Number(e.target.value) })}
            proofValue={formData.bookChapter[key].proof}
            onProofChange={(e) => updateField("bookChapter", key, { proof: e.target.value })}
            verifiedScore={formData.bookChapter[key].verified}
            disabled={locked}
          />
        ))}
        <ScoreCard label="Book Chapter Score" score={scores.bookChapter} total={150} />
      </SectionCard>

      {/* 4. Books Authored */}
      <SectionCard title="4. Books Authored / Edited">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.bookAuthored} />
        <MetricField label="International Indexed Books (100 marks each)" name="books.intlIn"
          value={formData.books.intlIn.value} onChange={(e) => updateField("books", "intlIn", { value: Number(e.target.value) })}
          proofValue={formData.books.intlIn.proof} onProofChange={(e) => updateField("books", "intlIn", { proof: e.target.value })}
          verifiedScore={formData.books.intlIn.verified} disabled={locked} />
        <MetricField label="Intl/Natl Non-Indexed Books (30 marks each)" name="books.intlNatl"
          value={formData.books.intlNatl.value} onChange={(e) => updateField("books", "intlNatl", { value: Number(e.target.value) })}
          proofValue={formData.books.intlNatl.proof} onProofChange={(e) => updateField("books", "intlNatl", { proof: e.target.value })}
          verifiedScore={formData.books.intlNatl.verified} disabled={locked} />
        <MetricField label="Local Books (10 marks each)" name="books.local"
          value={formData.books.local.value} onChange={(e) => updateField("books", "local", { value: Number(e.target.value) })}
          proofValue={formData.books.local.proof} onProofChange={(e) => updateField("books", "local", { proof: e.target.value })}
          verifiedScore={formData.books.local.verified} disabled={locked} />
        <ScoreCard label="Books Authored Score" score={scores.books} total={200} />
      </SectionCard>

      {/* 5. Citations */}
      <SectionCard title="5. Citations">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.citations} />
        <MetricField label="WoS/Scopus Citations (1 pt each)" name="citations.wos"
          value={formData.citations.wos.value} onChange={(e) => updateField("citations", "wos", { value: Number(e.target.value) })}
          proofValue={formData.citations.wos.proof} onProofChange={(e) => updateField("citations", "wos", { proof: e.target.value })}
          verifiedScore={formData.citations.wos.verified} disabled={locked} />
        <MetricField label="Scopus Citations (1 pt each)" name="citations.scopus"
          value={formData.citations.scopus.value} onChange={(e) => updateField("citations", "scopus", { value: Number(e.target.value) })}
          proofValue={formData.citations.scopus.proof} onProofChange={(e) => updateField("citations", "scopus", { proof: e.target.value })}
          verifiedScore={formData.citations.scopus.verified} disabled={locked} />
        <MetricField label="Google Scholar Citations (0.33 pt each)" name="citations.scholar"
          value={formData.citations.scholar.value} onChange={(e) => updateField("citations", "scholar", { value: Number(e.target.value) })}
          proofValue={formData.citations.scholar.proof} onProofChange={(e) => updateField("citations", "scholar", { proof: e.target.value })}
          verifiedScore={formData.citations.scholar.verified} disabled={locked} />
        <ScoreCard label="Citations Score" score={scores.citations} total={50} />
      </SectionCard>

      {/* 6. Copyright (Individual) */}
      <SectionCard title="6. Copyright — Individual">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.copyrightIndiv} />
        <MetricField label="Registered (5 marks each)" name="copyrightIndiv.registered"
          value={formData.copyrightIndiv.registered.value} onChange={(e) => updateField("copyrightIndiv", "registered", { value: Number(e.target.value) })}
          proofValue={formData.copyrightIndiv.registered.proof} onProofChange={(e) => updateField("copyrightIndiv", "registered", { proof: e.target.value })}
          verifiedScore={formData.copyrightIndiv.registered.verified} disabled={locked} />
        <MetricField label="Granted (15 marks each)" name="copyrightIndiv.granted"
          value={formData.copyrightIndiv.granted.value} onChange={(e) => updateField("copyrightIndiv", "granted", { value: Number(e.target.value) })}
          proofValue={formData.copyrightIndiv.granted.proof} onProofChange={(e) => updateField("copyrightIndiv", "granted", { proof: e.target.value })}
          verifiedScore={formData.copyrightIndiv.granted.verified} disabled={locked} />
        <ScoreCard label="Copyright Indiv Score" score={scores.copyrightIndiv} total={30} />
      </SectionCard>

      {/* 7. Copyright (Institutional) */}
      <SectionCard title="7. Copyright — Institutional">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.copyrightInst} />
        <MetricField label="Registered (10 marks each)" name="copyrightInst.registered"
          value={formData.copyrightInst.registered.value} onChange={(e) => updateField("copyrightInst", "registered", { value: Number(e.target.value) })}
          proofValue={formData.copyrightInst.registered.proof} onProofChange={(e) => updateField("copyrightInst", "registered", { proof: e.target.value })}
          verifiedScore={formData.copyrightInst.registered.verified} disabled={locked} />
        <MetricField label="Granted (30 marks each)" name="copyrightInst.granted"
          value={formData.copyrightInst.granted.value} onChange={(e) => updateField("copyrightInst", "granted", { value: Number(e.target.value) })}
          proofValue={formData.copyrightInst.granted.proof} onProofChange={(e) => updateField("copyrightInst", "granted", { proof: e.target.value })}
          verifiedScore={formData.copyrightInst.granted.verified} disabled={locked} />
        <ScoreCard label="Copyright Inst Score" score={scores.copyrightInst} total="No limit" />
      </SectionCard>

      {/* 8. Patent (Individual) */}
      <SectionCard title="8. Patent — Individual">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.patentIndiv} />
        {(["registered", "published", "granted", "commercialized"] as const).map((key) => (
          <MetricField key={key} label={`${key.charAt(0).toUpperCase() + key.slice(1)} Patent`}
            name={`patentIndiv.${key}`}
            value={formData.patentIndiv[key].value} onChange={(e) => updateField("patentIndiv", key, { value: Number(e.target.value) })}
            proofValue={formData.patentIndiv[key].proof} onProofChange={(e) => updateField("patentIndiv", key, { proof: e.target.value })}
            verifiedScore={formData.patentIndiv[key].verified} disabled={locked} />
        ))}
        <ScoreCard label="Patent Indiv Score" score={scores.patentIndiv} total={100} />
      </SectionCard>

      {/* 9. Patent (Institutional) */}
      <SectionCard title="9. Patent — Institutional">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.patentInst} />
        {(["registered", "published", "granted", "commercialized"] as const).map((key) => (
          <MetricField key={key} label={`${key.charAt(0).toUpperCase() + key.slice(1)} Patent`}
            name={`patentInst.${key}`}
            value={formData.patentInst[key].value} onChange={(e) => updateField("patentInst", key, { value: Number(e.target.value) })}
            proofValue={formData.patentInst[key].proof} onProofChange={(e) => updateField("patentInst", key, { proof: e.target.value })}
            verifiedScore={formData.patentInst[key].verified} disabled={locked} />
        ))}
        <ScoreCard label="Patent Inst Score" score={scores.patentInst} total="No limit" />
      </SectionCard>

      {/* 10. Research Grants */}
      <SectionCard title="10. Research Grants">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.grantsResearch} />
        <MetricField label="Grant Amount (₹ in Lakhs)" name="grantResearch.amount"
          value={formData.grantResearch.amount.value} onChange={(e) => updateField("grantResearch", "amount", { value: Number(e.target.value) })}
          proofValue={formData.grantResearch.amount.proof} onProofChange={(e) => updateField("grantResearch", "amount", { proof: e.target.value })}
          verifiedScore={formData.grantResearch.amount.verified} disabled={locked} />
        <ScoreCard label="Research Grants Score" score={scores.grantResearch} total="No limit" />
      </SectionCard>

      {/* 11. Revenue through Training */}
      <SectionCard title="11. Revenue through Training / Consultancy">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.revenueTraining} />
        <MetricField label="Revenue Amount (₹ in thousands)" name="revenueTraining.amount"
          value={formData.revenueTraining.amount.value} onChange={(e) => updateField("revenueTraining", "amount", { value: Number(e.target.value) })}
          proofValue={formData.revenueTraining.amount.proof} onProofChange={(e) => updateField("revenueTraining", "amount", { proof: e.target.value })}
          verifiedScore={formData.revenueTraining.amount.verified} disabled={locked} />
        <ScoreCard label="Training Revenue Score" score={scores.revenueTraining} total={40} />
      </SectionCard>

      {/* 12. Non-Research Grants */}
      <SectionCard title="12. Non-Research Grants">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.grantsNonResearch} />
        <MetricField label="Grant Amount (₹ in thousands)" name="grantNonResearch.amount"
          value={formData.grantNonResearch.amount.value} onChange={(e) => updateField("grantNonResearch", "amount", { value: Number(e.target.value) })}
          proofValue={formData.grantNonResearch.amount.proof} onProofChange={(e) => updateField("grantNonResearch", "amount", { proof: e.target.value })}
          verifiedScore={formData.grantNonResearch.amount.verified} disabled={locked} />
        <ScoreCard label="Non-Research Grants Score" score={scores.grantNonResearch} total={40} />
      </SectionCard>

      {/* 13. Product */}
      <SectionCard title="13. Products Developed">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.product} />
        <MetricField label="Commercialized Products (100 marks each)" name="product.commercialized"
          value={formData.product.commercialized.value} onChange={(e) => updateField("product", "commercialized", { value: Number(e.target.value) })}
          proofValue={formData.product.commercialized.proof} onProofChange={(e) => updateField("product", "commercialized", { proof: e.target.value })}
          verifiedScore={formData.product.commercialized.verified} disabled={locked} />
        <MetricField label="Developed Products (40 marks each)" name="product.developed"
          value={formData.product.developed.value} onChange={(e) => updateField("product", "developed", { value: Number(e.target.value) })}
          proofValue={formData.product.developed.proof} onProofChange={(e) => updateField("product", "developed", { proof: e.target.value })}
          verifiedScore={formData.product.developed.verified} disabled={locked} />
        <MetricField label="POC Products (10 marks each)" name="product.poc"
          value={formData.product.poc.value} onChange={(e) => updateField("product", "poc", { value: Number(e.target.value) })}
          proofValue={formData.product.poc.proof} onProofChange={(e) => updateField("product", "poc", { proof: e.target.value })}
          verifiedScore={formData.product.poc.verified} disabled={locked} />
        <ScoreCard label="Products Score" score={scores.product} total={100} />
      </SectionCard>

      {/* 14. Startup */}
      <SectionCard title="14. Startups">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.startup} />
        <MetricField label="Revenue > 50k (100 marks each)" name="startup.rev50k"
          value={formData.startup.rev50k.value} onChange={(e) => updateField("startup", "rev50k", { value: Number(e.target.value) })}
          proofValue={formData.startup.rev50k.proof} onProofChange={(e) => updateField("startup", "rev50k", { proof: e.target.value })}
          verifiedScore={formData.startup.rev50k.verified} disabled={locked} />
        <MetricField label="Funding > 5L (100 marks each)" name="startup.fund5L"
          value={formData.startup.fund5L.value} onChange={(e) => updateField("startup", "fund5L", { value: Number(e.target.value) })}
          proofValue={formData.startup.fund5L.proof} onProofChange={(e) => updateField("startup", "fund5L", { proof: e.target.value })}
          verifiedScore={formData.startup.fund5L.verified} disabled={locked} />
        <MetricField label="Product Stage (40 marks each)" name="startup.product"
          value={formData.startup.product.value} onChange={(e) => updateField("startup", "product", { value: Number(e.target.value) })}
          proofValue={formData.startup.product.proof} onProofChange={(e) => updateField("startup", "product", { proof: e.target.value })}
          verifiedScore={formData.startup.product.verified} disabled={locked} />
        <MetricField label="POC Stage (10 marks each)" name="startup.poc"
          value={formData.startup.poc.value} onChange={(e) => updateField("startup", "poc", { value: Number(e.target.value) })}
          proofValue={formData.startup.poc.proof} onProofChange={(e) => updateField("startup", "poc", { proof: e.target.value })}
          verifiedScore={formData.startup.poc.verified} disabled={locked} />
        <MetricField label="Registered Startups (5 marks each)" name="startup.registered"
          value={formData.startup.registered.value} onChange={(e) => updateField("startup", "registered", { value: Number(e.target.value) })}
          proofValue={formData.startup.registered.proof} onProofChange={(e) => updateField("startup", "registered", { proof: e.target.value })}
          verifiedScore={formData.startup.registered.verified} disabled={locked} />
        <ScoreCard label="Startup Score" score={scores.startup} total="No limit" />
      </SectionCard>

      {/* 15. Awards */}
      <SectionCard title="15. Awards &amp; Fellowships">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.award} />
        <MetricField label="International Awards (30 marks each)" name="award.intl"
          value={formData.award.intl.value} onChange={(e) => updateField("award", "intl", { value: Number(e.target.value) })}
          proofValue={formData.award.intl.proof} onProofChange={(e) => updateField("award", "intl", { proof: e.target.value })}
          verifiedScore={formData.award.intl.verified} disabled={locked} />
        <MetricField label="Government Awards (20 marks each)" name="award.govt"
          value={formData.award.govt.value} onChange={(e) => updateField("award", "govt", { value: Number(e.target.value) })}
          proofValue={formData.award.govt.proof} onProofChange={(e) => updateField("award", "govt", { proof: e.target.value })}
          verifiedScore={formData.award.govt.verified} disabled={locked} />
        <MetricField label="National Awards (5 marks each)" name="award.national"
          value={formData.award.national.value} onChange={(e) => updateField("award", "national", { value: Number(e.target.value) })}
          proofValue={formData.award.national.proof} onProofChange={(e) => updateField("award", "national", { proof: e.target.value })}
          verifiedScore={formData.award.national.verified} disabled={locked} />
        <MetricField label="International Fellowships (50 marks each)" name="award.intlFellow"
          value={formData.award.intlFellow.value} onChange={(e) => updateField("award", "intlFellow", { value: Number(e.target.value) })}
          proofValue={formData.award.intlFellow.proof} onProofChange={(e) => updateField("award", "intlFellow", { proof: e.target.value })}
          verifiedScore={formData.award.intlFellow.verified} disabled={locked} />
        <MetricField label="National Fellowships (30 marks each)" name="award.natlFellow"
          value={formData.award.natlFellow.value} onChange={(e) => updateField("award", "natlFellow", { value: Number(e.target.value) })}
          proofValue={formData.award.natlFellow.proof} onProofChange={(e) => updateField("award", "natlFellow", { proof: e.target.value })}
          verifiedScore={formData.award.natlFellow.verified} disabled={locked} />
        <ScoreCard label="Awards &amp; Fellowships Score" score={scores.award} total={50} />
      </SectionCard>

      {/* 16. Industry Interaction */}
      <SectionCard title="16. National/International Industry/University Interaction">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.interaction} />
        <MetricField label="Active MoUs (10 marks each)" name="interaction.mou"
          value={formData.interaction.mou.value} onChange={(e) => updateField("interaction", "mou", { value: Number(e.target.value) })}
          proofValue={formData.interaction.mou.proof} onProofChange={(e) => updateField("interaction", "mou", { proof: e.target.value })}
          verifiedScore={formData.interaction.mou.verified} disabled={locked} />
        <MetricField label="Industry Collaboration (20 marks each)" name="interaction.collab"
          value={formData.interaction.collab.value} onChange={(e) => updateField("interaction", "collab", { value: Number(e.target.value) })}
          proofValue={formData.interaction.collab.proof} onProofChange={(e) => updateField("interaction", "collab", { proof: e.target.value })}
          verifiedScore={formData.interaction.collab.verified} disabled={locked} />
        <ScoreCard label="Industry/University Interaction Score" score={scores.interaction} total="No limit" />
      </SectionCard>

      {/* 17. Placement */}
      <SectionCard title="17. Industry Association for Internship / Placement">
        <DriveLinkNote />
        <TransparencyGuideline formula={FORMULAS.placement} />
        <MetricField label="Internship/Placement Offers (10 marks each)" name="placement.offer"
          value={formData.placement.offer.value} onChange={(e) => updateField("placement", "offer", { value: Number(e.target.value) })}
          proofValue={formData.placement.offer.proof} onProofChange={(e) => updateField("placement", "offer", { proof: e.target.value })}
          verifiedScore={formData.placement.offer.verified} disabled={locked} />
        <ScoreCard label="Internship/Placement Score" score={scores.placement} total="No limit" />
      </SectionCard>

      {/* Score Summary */}
      <SectionCard title="Score Summary">
        <div className="overflow-hidden rounded-xl border-2 border-indigo-200">
          <table className="w-full text-base">
            <tbody className="divide-y divide-indigo-100">
              {verifiedTotalScore !== undefined && (
                <tr className="bg-indigo-50">
                  <td className="px-6 py-4 font-semibold uppercase tracking-widest text-base text-indigo-700">
                    Total Marks After Verification
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold tabular-nums text-indigo-900">
                    {verifiedTotalScore}
                  </td>
                </tr>
              )}
              <tr className="bg-indigo-50">
                <td className="px-6 py-4 font-semibold uppercase tracking-widest text-base text-indigo-700">
                  Score before cadre limit
                </td>
                <td className="px-6 py-4 text-right font-extrabold tabular-nums text-indigo-900">
                  {Object.values(scores).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
              <tr className="bg-indigo-100 font-extrabold border-t-2 border-indigo-200 text-indigo-900">
                <td className="px-6 py-5 uppercase tracking-widest text-lg font-black">
                  Final Score (after cadre limit)
                </td>
                <td className="px-6 py-5 text-right tabular-nums text-2xl text-indigo-800 font-black">
                  {totalScore} / {maxTotal}
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
          disabled={isSubmitting}
          aria-label="Save Research Data"
          className="min-w-[260px] shadow-lg shadow-indigo-200 uppercase tracking-widest text-base font-black bg-indigo-700 hover:bg-indigo-800 text-white transition-all transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting ? "Saving…" : "Save Research Data"}
        </Button>
      </div>

      {showStatusModal && (
        <FormLockedModal formStatus={formStatus} onClose={() => setShowStatusModal(false)} />
      )}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Research performance data saved successfully!"
      />
    </div>
  );
}

export default PartBResearch;
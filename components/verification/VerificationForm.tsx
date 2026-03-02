"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import {
    CheckSquare,
    AlertCircle,
    ArrowLeft,
    ChevronRight,
    Calculator,
    User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Loader from "@/components/loader";
import SectionCard from "../forms/shared/SectionCard";
import MetricField from "../forms/shared/MetricField";
import ScoreCard from "../forms/shared/ScoreCard";
import { PART_B_WEIGHTS } from "@/lib/forms/constants";
import { useAuth } from "@/app/AuthProvider";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// --- DEFAULTS ---
const SECTION_LIMITS = {
    bookChapters: 150,
    books: 200,
    citations: 50,
    copyrightIndividual: 30,
    patentIndividual: 100,
    trainingPrograms: 40,
    nonResearchGrants: 40,
    productDevelopment: 100,
    awardsAndFellowships: 50,
};

const CADRE_LIMITS = {
    "Professor": 370,
    "Associate Professor": 300,
    "Assistant Professor": 210,
    "default": 210,
};

// Weight mapping for calculating claimed marks (count * weight)
const WEIGHTS: Record<string, number> = {
    // Papers
    "papers_sci": 100,
    "papers_esci": 50,
    "papers_scopus": 50,
    "papers_ugc": 10,
    "papers_other": 5,
    // Conferences
    "conferences_scopus": 20,
    "conferences_other": 10,
    // Book Chapters
    "bookChapters_scopus": 20,
    "bookChapters_other": 10,
    // Books
    "books_intlIndexed": 50,
    "books_intlNational": 30,
    "books_local": 10,
    // Citations
    "citations_wos": 1,
    "citations_scopus": 1,
    "citations_googleScholar": 0.5,
    // Copyrights
    "copyrights_individualRegistered": 10,
    "copyrights_individualGranted": 20,
    "copyrights_instituteRegistered": 5,
    "copyrights_instituteGranted": 10,
    // Patents
    "patents_individualRegistered": 10,
    "patents_individualPublished": 20,
    "patents_individualGranted": 50,
    "patents_individualCommercialized": 100,
    "patents_instituteRegistered": 5,
    "patents_institutePublished": 10,
    "patents_instituteGranted": 30,
    "patents_instituteCommercialized": 50,
    // Grants
    "grants_research": 50,
    "grants_nonResearch": 20,
    "revenueTraining": 10,
    // Products
    "products_commercialized": 100,
    "products_developed": 50,
    "products_poc": 30,
    // Startup
    "startup_revenue": 100,
    "startup_funding": 80,
    "startup_product": 60,
    "startup_poc": 40,
    "startup_registered": 20,
    // Awards
    "awards_international": 50,
    "awards_government": 40,
    "awards_national": 30,
    "awards_intlFellowship": 40,
    "awards_nationalFellowship": 30,
    // Industry Interaction
    "industryInteraction_activeMou": 20,
    "industryInteraction_collaboration": 30,
    // Placement
    "placement": 10,
};

// --- TYPES ---
interface MetricMarks {
    marks: number;
}

interface VerifiedScores {
    [key: string]: MetricMarks;
}

interface FacultyData {
    id: string;
    name: string;
    role: string;
    department: string;
    partB?: any;
}

export default function VerificationForm() {
    const params = useParams();
    const router = useRouter();
    const facultyId = params.facultyId as string;
    const department = params.department as string;
    const { token } = useAuth();

    const [faculty, setFaculty] = useState<FacultyData | null>(null);
    const [originalData, setOriginalData] = useState<any>(null);
    const [verifiedScores, setVerifiedScores] = useState<VerifiedScores>({});
    const [manualFinalTotal, setManualFinalTotal] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch faculty data and their appraisal
    const fetchData = useCallback(async () => {
        if (!token) {
            setError("Authentication required");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(
                `${BACKEND}/verification/part-b/${facultyId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.data.success) {
                setError(response.data.message || "Failed to load verification data");
                return;
            }

            const { faculty: facultyData, partB, appraisalStatus } = response.data.data;

            setFaculty({
                id: facultyData.userId,
                name: facultyData.name,
                role: facultyData.designation,
                department: facultyData.department,
            });

            setOriginalData(partB || {});

            // Pre-fill verified marks with claimed values (count * weight) or existing verified values
            const existing: VerifiedScores = {};
            if (partB) {
                // Map papers
                if (partB.papers) {
                    Object.keys(partB.papers).forEach(key => {
                        const item = partB.papers[key];
                        const fieldName = `papers_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        // Use verified if exists and not 0, otherwise use calculated claimed
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map conferences
                if (partB.conferences) {
                    Object.keys(partB.conferences).forEach(key => {
                        const item = partB.conferences[key];
                        const fieldName = `conferences_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map bookChapters
                if (partB.bookChapters) {
                    Object.keys(partB.bookChapters).forEach(key => {
                        const item = partB.bookChapters[key];
                        const fieldName = `bookChapters_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map books
                if (partB.books) {
                    Object.keys(partB.books).forEach(key => {
                        const item = partB.books[key];
                        const fieldName = `books_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map citations
                if (partB.citations) {
                    Object.keys(partB.citations).forEach(key => {
                        const item = partB.citations[key];
                        const fieldName = `citations_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map copyrights
                if (partB.copyrights) {
                    Object.keys(partB.copyrights).forEach(key => {
                        const item = partB.copyrights[key];
                        const fieldName = `copyrights_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map patents
                if (partB.patents) {
                    Object.keys(partB.patents).forEach(key => {
                        const item = partB.patents[key];
                        const fieldName = `patents_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map grants
                if (partB.grants) {
                    Object.keys(partB.grants).forEach(key => {
                        const item = partB.grants[key];
                        const fieldName = `grants_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map revenueTraining (single field)
                if (partB.revenueTraining) {
                    const fieldName = 'revenueTraining';
                    const weight = WEIGHTS[fieldName] || 0;
                    const calculatedClaimed = (partB.revenueTraining.count || 0) * weight;
                    const marks = (partB.revenueTraining.verified !== undefined && partB.revenueTraining.verified !== 0) 
                        ? partB.revenueTraining.verified 
                        : calculatedClaimed;
                    existing[fieldName] = { marks };
                }
                // Map products
                if (partB.products) {
                    Object.keys(partB.products).forEach(key => {
                        const item = partB.products[key];
                        const fieldName = `products_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map startup
                if (partB.startup) {
                    Object.keys(partB.startup).forEach(key => {
                        const item = partB.startup[key];
                        const fieldName = `startup_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map awards
                if (partB.awards) {
                    Object.keys(partB.awards).forEach(key => {
                        const item = partB.awards[key];
                        const fieldName = `awards_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map industryInteraction
                if (partB.industryInteraction) {
                    Object.keys(partB.industryInteraction).forEach(key => {
                        const item = partB.industryInteraction[key];
                        const fieldName = `industryInteraction_${key}`;
                        const weight = WEIGHTS[fieldName] || 0;
                        const calculatedClaimed = (item?.count || 0) * weight;
                        const marks = (item?.verified !== undefined && item.verified !== 0) 
                            ? item.verified 
                            : calculatedClaimed;
                        existing[fieldName] = { marks };
                    });
                }
                // Map placement (single field)
                if (partB.placement) {
                    const fieldName = 'placement';
                    const weight = WEIGHTS[fieldName] || 0;
                    const calculatedClaimed = (partB.placement.count || 0) * weight;
                    const marks = (partB.placement.verified !== undefined && partB.placement.verified !== 0) 
                        ? partB.placement.verified 
                        : calculatedClaimed;
                    existing[fieldName] = { marks };
                }
            }
            setVerifiedScores(existing);
        } catch (err: any) {
            console.error("Error fetching verification data:", err);
            setError(err.response?.data?.message || "Failed to load data for verification");
        } finally {
            setLoading(false);
        }
    }, [facultyId, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleScoreChange = (key: string, val: number) => {
        setVerifiedScores(prev => ({
            ...prev,
            [key]: { marks: val }
        }));
    };

    const sections = useMemo(() => [
        {
            id: "journal",
            title: "1. Journal Publications",
            metrics: [
                { label: "SCI Journal Papers", name: "papers_sci", weight: 100, original: originalData?.papers?.sci },
                { label: "ESCI Journal Papers", name: "papers_esci", weight: 50, original: originalData?.papers?.esci },
                { label: "Scopus Journal Papers", name: "papers_scopus", weight: 50, original: originalData?.papers?.scopus },
                { label: "UGC CARE Journal Papers", name: "papers_ugc", weight: 10, original: originalData?.papers?.ugc },
                { label: "Other Journal Papers", name: "papers_other", weight: 5, original: originalData?.papers?.other },
            ]
        },
        {
            id: "conference",
            title: "2. Conference Publications",
            metrics: [
                { label: "Scopus/WoS Conference", name: "conferences_scopus", weight: 20, original: originalData?.conferences?.scopus },
                { label: "Other Conference", name: "conferences_other", weight: 10, original: originalData?.conferences?.other },
            ]
        },
        {
            id: "bookChapters",
            title: "3. Book Chapters",
            metrics: [
                { label: "Scopus/WoS Book Chapter", name: "bookChapters_scopus", weight: 20, original: originalData?.bookChapters?.scopus },
                { label: "Other Book Chapter", name: "bookChapters_other", weight: 10, original: originalData?.bookChapters?.other },
            ],
            limit: SECTION_LIMITS.bookChapters
        },
        {
            id: "books",
            title: "4. Books",
            metrics: [
                { label: "International Indexed Book", name: "books_intlIndexed", weight: 50, original: originalData?.books?.intlIndexed },
                { label: "International/National Book", name: "books_intlNational", weight: 30, original: originalData?.books?.intlNational },
                { label: "Local Book", name: "books_local", weight: 10, original: originalData?.books?.local },
            ],
            limit: SECTION_LIMITS.books
        },
        {
            id: "citations",
            title: "5. Citations",
            metrics: [
                { label: "Web of Science Citations", name: "citations_wos", weight: 1, original: originalData?.citations?.wos },
                { label: "Scopus Citations", name: "citations_scopus", weight: 1, original: originalData?.citations?.scopus },
                { label: "Google Scholar Citations", name: "citations_googleScholar", weight: 0.5, original: originalData?.citations?.googleScholar },
            ],
            limit: SECTION_LIMITS.citations
        },
        {
            id: "copyrights",
            title: "6. Copyrights",
            metrics: [
                { label: "Individual Copyright Registered", name: "copyrights_individualRegistered", weight: 10, original: originalData?.copyrights?.individualRegistered },
                { label: "Individual Copyright Granted", name: "copyrights_individualGranted", weight: 20, original: originalData?.copyrights?.individualGranted },
                { label: "Institute Copyright Registered", name: "copyrights_instituteRegistered", weight: 5, original: originalData?.copyrights?.instituteRegistered },
                { label: "Institute Copyright Granted", name: "copyrights_instituteGranted", weight: 10, original: originalData?.copyrights?.instituteGranted },
            ],
            limit: SECTION_LIMITS.copyrightIndividual
        },
        {
            id: "patents",
            title: "7. Patents",
            metrics: [
                { label: "Individual Patent Registered", name: "patents_individualRegistered", weight: 10, original: originalData?.patents?.individualRegistered },
                { label: "Individual Patent Published", name: "patents_individualPublished", weight: 20, original: originalData?.patents?.individualPublished },
                { label: "Individual Patent Granted", name: "patents_individualGranted", weight: 50, original: originalData?.patents?.individualGranted },
                { label: "Individual Patent Commercialized", name: "patents_individualCommercialized", weight: 100, original: originalData?.patents?.individualCommercialized },
                { label: "Institute Patent Registered", name: "patents_instituteRegistered", weight: 5, original: originalData?.patents?.instituteRegistered },
                { label: "Institute Patent Published", name: "patents_institutePublished", weight: 10, original: originalData?.patents?.institutePublished },
                { label: "Institute Patent Granted", name: "patents_instituteGranted", weight: 30, original: originalData?.patents?.instituteGranted },
                { label: "Institute Patent Commercialized", name: "patents_instituteCommercialized", weight: 50, original: originalData?.patents?.instituteCommercialized },
            ],
            limit: SECTION_LIMITS.patentIndividual
        },
        {
            id: "grants",
            title: "8. Research & Training Grants",
            metrics: [
                { label: "Research Grants", name: "grants_research", weight: 50, original: originalData?.grants?.research },
                { label: "Non-Research Grants", name: "grants_nonResearch", weight: 20, original: originalData?.grants?.nonResearch },
                { label: "Training Programs (Revenue)", name: "revenueTraining", weight: 10, original: originalData?.revenueTraining },
            ],
            limit: SECTION_LIMITS.nonResearchGrants
        },
        {
            id: "products",
            title: "9. Product Development",
            metrics: [
                { label: "Commercialized Product", name: "products_commercialized", weight: 100, original: originalData?.products?.commercialized },
                { label: "Developed Product", name: "products_developed", weight: 50, original: originalData?.products?.developed },
                { label: "Product PoC", name: "products_poc", weight: 30, original: originalData?.products?.poc },
            ],
            limit: SECTION_LIMITS.productDevelopment
        },
        {
            id: "startup",
            title: "10. Startup & Entrepreneurship",
            metrics: [
                { label: "Startup Revenue", name: "startup_revenue", weight: 100, original: originalData?.startup?.revenue },
                { label: "Startup Funding", name: "startup_funding", weight: 80, original: originalData?.startup?.funding },
                { label: "Startup Product", name: "startup_product", weight: 60, original: originalData?.startup?.product },
                { label: "Startup PoC", name: "startup_poc", weight: 40, original: originalData?.startup?.poc },
                { label: "Startup Registered", name: "startup_registered", weight: 20, original: originalData?.startup?.registered },
            ]
        },
        {
            id: "awards",
            title: "11. Awards & Fellowships",
            metrics: [
                { label: "International Award", name: "awards_international", weight: 50, original: originalData?.awards?.international },
                { label: "Government Award", name: "awards_government", weight: 40, original: originalData?.awards?.government },
                { label: "National Award", name: "awards_national", weight: 30, original: originalData?.awards?.national },
                { label: "International Fellowship", name: "awards_intlFellowship", weight: 40, original: originalData?.awards?.intlFellowship },
                { label: "National Fellowship", name: "awards_nationalFellowship", weight: 30, original: originalData?.awards?.nationalFellowship },
            ],
            limit: SECTION_LIMITS.awardsAndFellowships
        },
        {
            id: "industryInteraction",
            title: "12. Industry Interaction",
            metrics: [
                { label: "Active MoU", name: "industryInteraction_activeMou", weight: 20, original: originalData?.industryInteraction?.activeMou },
                { label: "Industry Collaboration", name: "industryInteraction_collaboration", weight: 30, original: originalData?.industryInteraction?.collaboration },
            ]
        },
        {
            id: "placement",
            title: "13. Placement Activities",
            metrics: [
                { label: "Placement Support", name: "placement", weight: 10, original: originalData?.placement },
            ]
        }
    ], [originalData, verifiedScores]);

    // Calculation logic
    const results = useMemo(() => {
        let totalUnfiltered = 0;
        const sectionScores: Record<string, number> = {};

        sections.forEach(sec => {
            let secSum = sec.metrics.reduce((a, b: any) => a + (verifiedScores[b.name]?.marks || 0), 0);
            if (sec.limit) {
                secSum = Math.min(sec.limit, secSum);
            }
            sectionScores[sec.id] = secSum;
            totalUnfiltered += secSum;
        });

        const limit = (faculty?.role && (CADRE_LIMITS as any)[faculty.role]) || CADRE_LIMITS.default;
        const calculatedFinalTotal = Math.min(limit, totalUnfiltered);
        const finalTotal = manualFinalTotal !== null ? manualFinalTotal : calculatedFinalTotal;

        return { sectionScores, totalUnfiltered, calculatedFinalTotal, finalTotal, limit };
    }, [verifiedScores, faculty?.role, sections, manualFinalTotal]);

    const handleSave = async () => {
        if (!token) {
            alert("Authentication required");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                verifiedScores,
                finalTotal: results.finalTotal
            };
            
            const response = await axios.post(
                `${BACKEND}/verification/finalize/${facultyId}`, 
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                alert("Verification finalized successfully! Status updated to Portfolio Marks Pending.");
                router.push("/verification-team/dashboard");
            } else {
                alert(response.data.message || "Failed to finalize verification");
            }
        } catch (err: any) {
            console.error("Error finalizing verification:", err);
            alert(err.response?.data?.message || "Failed to finalize verification");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader message="Preparing verification environment..." />;

    return (
        <div className="max-w-5xl mx-auto py-10 px-6 space-y-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <Button variant="outline" onClick={() => router.back()} className="rounded-xl h-12 w-12 p-0 border-2">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                            Verify <span className="text-indigo-600">Contributions</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5 font-bold text-slate-500 uppercase tracking-widest text-xs">
                            <span className="flex items-center gap-1"><UserIcon size={14} /> {faculty?.name}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>{faculty?.role}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>{department}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-5 py-3 text-right">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Total Verified</p>
                        <p className="text-3xl font-black text-emerald-700 leading-none flex items-baseline gap-1">
                            {results.finalTotal}
                            <span className="text-sm text-emerald-500/60 font-black">/ {results.limit}</span>
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Form Sections */}
            <div className="space-y-8 pb-32">
                {sections.map(sec => (
                    <SectionCard key={sec.id} title={sec.title}>
                        <div className="divide-y divide-slate-100">
                            {sec.metrics.map(m => {
                                const calculatedClaimed = (m.original?.count || 0) * m.weight;
                                return (
                                    <MetricField
                                        key={m.name}
                                        label={m.label}
                                        name={m.name}
                                        value={m.original?.count || 0}
                                        onChange={(e) => handleScoreChange(m.name, Number(e.target.value))}
                                        proofValue={m.original?.proof || ""}
                                        onProofChange={() => { }}
                                        verifiedScore={verifiedScores[m.name]?.marks}
                                        isVerificationMode={true}
                                        hint={`Weight: ${m.weight} per unit | Claimed: ${calculatedClaimed} marks`}
                                    />
                                );
                            })}
                        </div>
                        {sec.limit && (
                            <div className="mt-6 p-5 bg-indigo-50/50 rounded-2xl flex items-center justify-between border-2 border-indigo-100/50 group hover:border-indigo-200 transition-colors duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                        <Calculator size={16} />
                                    </div>
                                    <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Section Total / Max Limit</span>
                                </div>
                                <span className="text-xl font-black text-indigo-700">
                                    {results.sectionScores[sec.id]} <span className="text-sm text-indigo-400">/ {sec.limit}</span>
                                </span>
                            </div>
                        )}
                    </SectionCard>
                ))}

                {/* Final Action Bar */}
                <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-slate-800 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col justify-center">
                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">Calculated Total</p>
                            <p className="text-2xl font-black text-white leading-none">
                                {results.totalUnfiltered} <span className="text-slate-500 text-sm font-bold">(Unfiltered)</span>
                            </p>
                            <p className="text-emerald-400 text-xs font-bold mt-2">
                                Auto Final: {results.calculatedFinalTotal} / {results.limit}
                            </p>
                        </div>

                        <div className="flex flex-col justify-center">
                            <label className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <CheckSquare size={12} />
                                Override Final Total
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={results.limit}
                                value={manualFinalTotal !== null ? manualFinalTotal : ''}
                                onChange={(e) => setManualFinalTotal(e.target.value ? Number(e.target.value) : null)}
                                placeholder={`Auto: ${results.calculatedFinalTotal}`}
                                className="w-full rounded-xl border-2 border-amber-500/50 bg-slate-800 px-4 py-3 text-2xl font-black text-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 placeholder:text-slate-600"
                            />
                            <p className="text-slate-400 text-[9px] font-bold mt-1.5">Leave empty to use calculated value</p>
                        </div>

                        <div className="flex flex-col justify-center">
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Final Verified Total</p>
                            <p className="text-4xl font-black text-emerald-400 leading-none">
                                {results.finalTotal}
                            </p>
                            <p className="text-slate-500 text-xs font-bold mt-2">
                                Max Limit: {results.limit}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider h-14 px-10 rounded-2xl shadow-xl shadow-indigo-600/20 gap-2"
                        >
                            <CheckSquare size={20} />
                            {saving ? "Finalizing..." : "Finalize Verification"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

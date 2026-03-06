"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import axios, { AxiosError } from "axios";
import {
    ArrowLeft,
    User,
    Briefcase,
    Mail,
    Save,
    CheckCircle2,
    BookOpen,
    Users,
    Lightbulb,
    GitBranch,
    MessageSquare,
    Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/loader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import { containerVariants, itemVariants } from "@/lib/animations";

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacultyInfo {
    id: string;
    name: string;
    designation: string;
    role: string;
    email?: string;
    isHodMarksGiven?: boolean;
    hod_total_marks?: number;
}

interface ExternalReviewer {
    id: string;
    name: string;
    organization?: string;
    designation?: string;
    email?: string;
}

interface EvaluationState {
    knowledge: number | "";
    skills: number | "";
    attributes: number | "";
    outcomesInitiatives: number | "";
    selfBranching: number | "";
    teamPerformance: number | "";
    comments: string;
}

// ── Criteria Configuration ────────────────────────────────────────────────────

const CRITERIA = [
    {
        key: "knowledge" as const,
        label: "Knowledge",
        max: 20,
        description: "Assess the faculty member's subject knowledge, research background, and academic credentials.",
        icon: BookOpen,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
    {
        key: "skills" as const,
        label: "Skills",
        max: 20,
        description: "Assess teaching skills, communication, methodology, and pedagogical approach.",
        icon: Users,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
    {
        key: "attributes" as const,
        label: "Attributes",
        max: 10,
        description: "Assess professional behavior, punctuality, and interpersonal skills.",
        icon: User,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
    {
        key: "outcomesInitiatives" as const,
        label: "Outcomes & Initiatives",
        max: 20,
        description: "Assess research output, innovative teaching methods, and initiatives taken.",
        icon: Lightbulb,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
    {
        key: "selfBranching" as const,
        label: "Self Branching",
        max: 10,
        description: "Assess professional development, continuous learning, and self-improvement efforts.",
        icon: GitBranch,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
    {
        key: "teamPerformance" as const,
        label: "Team Performance",
        max: 20,
        description: "Assess ability to work within a team, collaborate with colleagues, and contribute to team goals.",
        icon: Users,
        color: "border-l-indigo-500 bg-indigo-50/40",
        labelColor: "text-indigo-700",
    },
] as const;

type CriteriaKey = typeof CRITERIA[number]["key"];
const MAX_PER_CRITERION: Record<CriteriaKey, number> = {
    knowledge: 20,
    skills: 20,
    attributes: 10,
    outcomesInitiatives: 20,
    selfBranching: 10,
    teamPerformance: 20,
};
const TOTAL_MAX = 100;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HodInteractionEvaluationPage() {
    const { toast } = useToast();
    const { user, token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const facultyId = params.facultyId as string;
    const dept = user?.department;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [faculty, setFaculty] = useState<FacultyInfo | null>(null);
    const [externalReviewer, setExternalReviewer] = useState<ExternalReviewer | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [evaluation, setEvaluation] = useState<EvaluationState>({
        knowledge: "",
        skills: "",
        attributes: "",
        outcomesInitiatives: "",
        selfBranching: "",
        teamPerformance: "",
        comments: "",
    });

    // ── Fetch faculty + assigned external reviewer ───────────────────────────

    const fetchData = useCallback(async () => {
        if (!dept || !token) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch all faculty users to find the faculty by ID
            const [usersRes, assignmentsRes] = await Promise.all([
                axios.get(`${API_BASE}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE}/api/hod/${dept}/external-assignments`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            // Find faculty by ID
            const allUsers = usersRes.data || [];
            const foundFaculty = allUsers.find((u: any) => u._id === facultyId);
            if (foundFaculty) {
                setFaculty({
                    id: foundFaculty._id,
                    name: foundFaculty.name,
                    designation: foundFaculty.desg || foundFaculty.designation || "",
                    role: foundFaculty.role || "",
                    email: foundFaculty.email,
                    isHodMarksGiven: foundFaculty.isHodMarksGiven,
                    hod_total_marks: foundFaculty.hod_total_marks,
                });
            } else {
                setError("Faculty member not found.");
                return;
            }

            // Find which external reviewer this faculty is assigned to
            if (assignmentsRes.data.success) {
                const assignmentsData: Record<string, any> = assignmentsRes.data.data || {};
                for (const [externalId, assignmentInfo] of Object.entries(assignmentsData)) {
                    const assignedFaculty: any[] = assignmentInfo?.assigned_faculty || [];
                    const isAssigned = assignedFaculty.some((f: any) => f._id === facultyId || f.id === facultyId);
                    if (isAssigned) {
                        const extRes = await axios.get(`${API_BASE}/api/hod/${dept}/get-externals`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (extRes.data.success) {
                            const ext = extRes.data.data.find((e: any) => e._id === externalId);
                            if (ext) {
                                setExternalReviewer({
                                    id: ext._id,
                                    name: ext.full_name,
                                    organization: ext.organization,
                                    designation: ext.desg,
                                    email: ext.mail,
                                });
                            }
                        }
                        break;
                    }
                }
            }
        } catch (err: any) {
            console.error("Error fetching evaluation data:", err);
            const axErr = err as AxiosError<{ message?: string }>;
            setError(axErr.response?.data?.message ?? axErr.message ?? "Failed to load data.");
            toast({ title: "Error", description: "Failed to load faculty evaluation data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [dept, token, facultyId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Derived: total score ─────────────────────────────────────────────────

    const totalScore =
        (Number(evaluation.knowledge) || 0) +
        (Number(evaluation.skills) || 0) +
        (Number(evaluation.attributes) || 0) +
        (Number(evaluation.outcomesInitiatives) || 0) +
        (Number(evaluation.selfBranching) || 0) +
        (Number(evaluation.teamPerformance) || 0);

    const completedCriteria = CRITERIA.filter(
        (c) => evaluation[c.key] !== "" && evaluation[c.key] !== null && evaluation[c.key] !== undefined
    ).length;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleScoreChange = (key: CriteriaKey, rawValue: string) => {
        if (rawValue === "") {
            setEvaluation((prev) => ({ ...prev, [key]: "" }));
            return;
        }
        const num = Math.min(MAX_PER_CRITERION[key], Math.max(0, parseInt(rawValue) || 0));
        setEvaluation((prev) => ({ ...prev, [key]: num }));
    };

    const handleSaveDraft = () => {
        if (!dept) return;
        const storageKey = `hod_eval_${dept}_${facultyId}`;
        localStorage.setItem(storageKey, JSON.stringify(evaluation));
        toast({ title: "Draft Saved", description: "Your evaluation progress has been saved locally." });
    };

    const handleSubmitClick = () => {
        const missing = CRITERIA.filter(
            (c) => evaluation[c.key] === "" || evaluation[c.key] === null || evaluation[c.key] === undefined
        );
        if (missing.length > 0) {
            toast({
                title: "Incomplete Evaluation",
                description: `Please complete all ${missing.length} remaining criteria before submitting.`,
                variant: "destructive",
            });
            return;
        }
        setShowConfirmDialog(true);
    };

    const handleConfirmSubmit = async () => {
        if (!externalReviewer || !dept || !token) {
            toast({ title: "Error", description: "Missing required information to submit.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            await axios.post(
                `${API_BASE}/${dept}/hod_interaction_marks/${externalReviewer.id}/${facultyId}`,
                {
                    total_marks: totalScore,
                    comments: evaluation.comments || "",
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Clear saved draft
            const storageKey = `hod_eval_${dept}_${facultyId}`;
            localStorage.removeItem(storageKey);

            setShowConfirmDialog(false);
            toast({ title: "Evaluation Submitted", description: `Marks submitted successfully for ${faculty?.name}.` });
            router.push("/hod/assign-faculty-external");
        } catch (err: any) {
            console.error("Error submitting evaluation:", err);
            const axErr = err as AxiosError<{ message?: string }>;
            toast({
                title: "Submission Failed",
                description: axErr.response?.data?.message ?? axErr.message ?? "Failed to submit evaluation.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    // ── Render Guards ─────────────────────────────────────────────────────────

    if (loading) {
        return <Loader variant="page" message="Loading evaluation data…" />;
    }

    if (error && !faculty) {
        return (
            <div className="min-h-screen p-4 md:p-6 lg:p-8">
                <Card className="max-w-xl mx-auto border-destructive/30 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => router.push("/hod/assign-faculty-external")} className="gap-2">
                            <ArrowLeft size={14} /> Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Main Render ───────────────────────────────────────────────────────────

    return (
        <>
            <motion.div
                className="max-w-4xl mx-auto space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Back nav */}
                <motion.div variants={itemVariants}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/hod/assign-faculty-external")}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft size={14} />
                        Back to Dashboard
                    </Button>
                </motion.div>

                {/* Faculty Profile Card */}
                <motion.div variants={itemVariants}>
                    <Card className="border shadow-sm overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white pb-5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest">
                                HOD Interaction Evaluation
                            </CardTitle>
                            <p className="text-indigo-100 text-sm mt-1">
                                Please evaluate this faculty member based on your interactions. Your assessment forms part of their overall performance appraisal.
                            </p>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                {/* Avatar */}
                                <div className="h-20 w-20 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center shrink-0">
                                    <User size={36} className="text-indigo-600" />
                                </div>

                                {/* Faculty Details */}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h2 className="text-2xl font-black text-foreground tracking-tight">{faculty?.name}</h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs bg-indigo-600 text-white border-transparent px-3">{faculty?.role}</Badge>
                                            {faculty?.designation && (
                                                <span className="text-xs text-muted-foreground">{faculty.designation}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Briefcase size={14} className="text-indigo-500 shrink-0" />
                                            <span><span className="font-semibold text-foreground">Department:</span> {dept || "—"}</span>
                                        </div>
                                        {faculty?.email && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail size={14} className="text-indigo-500 shrink-0" />
                                                <span className="truncate">{faculty.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* External Reviewer Info */}
                                    {externalReviewer && (
                                        <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">External Reviewer</p>
                                            <p className="font-semibold text-foreground">{externalReviewer.name}</p>
                                            {externalReviewer.organization && (
                                                <p className="text-muted-foreground text-xs">{externalReviewer.organization}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Progress indicator */}
                <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                        <span>Criteria completed: <span className="font-bold text-foreground">{completedCriteria} / {CRITERIA.length}</span></span>
                        <span>Total Score: <span className="font-black text-indigo-700 text-base">{totalScore}</span><span className="text-muted-foreground"> / {TOTAL_MAX}</span></span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${(completedCriteria / CRITERIA.length) * 100}%` }}
                        />
                    </div>
                </motion.div>

                {/* Evaluation Criteria Cards */}
                <motion.div variants={containerVariants} className="space-y-4">
                    {CRITERIA.map((criterion) => {
                        const Icon = criterion.icon;
                        const currentValue = evaluation[criterion.key];
                        const isFilled = currentValue !== "" && currentValue !== null;

                        return (
                            <motion.div key={criterion.key} variants={itemVariants}>
                                <div
                                    className={`border-l-4 rounded-xl p-5 transition-all duration-200 ${criterion.color} ${isFilled ? "border border-border/50" : "border border-transparent"}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`mt-0.5 p-2 rounded-lg bg-white border border-border/50 shrink-0`}>
                                                <Icon size={16} className={criterion.labelColor} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-black text-sm uppercase tracking-widest ${criterion.labelColor}`}>
                                                        {criterion.label}
                                                    </h3>
                                                    {isFilled && (
                                                        <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{criterion.description}</p>
                                            </div>
                                        </div>

                                        {/* Score input */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <input
                                                type="number"
                                                min={0}
                                                max={criterion.max}
                                                placeholder="0"
                                                value={currentValue}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                onChange={(e) => handleScoreChange(criterion.key, e.target.value)}
                                                aria-label={`${criterion.label} score`}
                                                className="w-20 rounded-lg border-2 border-border bg-white px-3 py-1.5 text-center text-lg font-black tabular-nums text-foreground focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="text-sm text-muted-foreground font-semibold">/ {criterion.max}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Comments */}
                <motion.div variants={itemVariants}>
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={14} className="text-indigo-600" />
                                Additional Comments
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 border-indigo-200">Optional</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Textarea
                                placeholder="Provide any additional feedback or comments about this faculty member's performance during your interaction…"
                                value={evaluation.comments}
                                onChange={(e) => setEvaluation((prev) => ({ ...prev, comments: e.target.value }))}
                                rows={4}
                                className="resize-none text-sm focus-visible:ring-indigo-300 focus-visible:border-indigo-500"
                            />
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Score Summary + Action Buttons */}
                <motion.div variants={itemVariants}>
                    <Card className="border-2 border-indigo-100 bg-indigo-50/30 shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* Total score display */}
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-100">
                                        <Calculator size={18} className="text-indigo-700" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Score</p>
                                        <p className="text-3xl font-black text-indigo-900 leading-none">
                                            {totalScore}
                                            <span className="text-base font-bold text-indigo-400 ml-1">/ {TOTAL_MAX}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveDraft}
                                        disabled={saving}
                                        className="gap-2"
                                    >
                                        <Save size={14} />
                                        Save Draft
                                    </Button>

                                    <Button
                                        onClick={handleSubmitClick}
                                        disabled={saving || completedCriteria < CRITERIA.length}
                                        className="gap-2 bg-indigo-700 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:transform-none"
                                    >
                                        <CheckCircle2 size={16} />
                                        Submit Evaluation
                                    </Button>
                                </div>
                            </div>

                            {completedCriteria < CRITERIA.length && (
                                <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                                    Complete all {CRITERIA.length} criteria to enable submission. ({CRITERIA.length - completedCriteria} remaining)
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-base uppercase tracking-widest">
                            Confirm Submission
                        </DialogTitle>
                        <DialogDescription>
                            Once submitted, this evaluation cannot be changed. Please review the summary below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        {/* Faculty info summary */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-sm space-y-1">
                            <p><span className="font-semibold">Faculty:</span> {faculty?.name}</p>
                            {externalReviewer && (
                                <p><span className="font-semibold">External Reviewer:</span> {externalReviewer.name}</p>
                            )}
                        </div>

                        {/* Score breakdown */}
                        <div className="space-y-1.5">
                            {CRITERIA.map((c) => (
                                <div key={c.key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{c.label}</span>
                                    <span className="font-bold tabular-nums">
                                        {evaluation[c.key] !== "" ? evaluation[c.key] : 0} / {c.max}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm pt-2 border-t border-border font-black">
                                <span>Total</span>
                                <span className="text-indigo-700">{totalScore} / {TOTAL_MAX}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={saving}
                            className="px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmSubmit}
                            disabled={saving}
                            className="gap-2 px-6 bg-indigo-700 hover:bg-indigo-800 text-white"
                        >
                            {saving ? <Loader variant="inline" /> : <CheckCircle2 size={15} />}
                            {saving ? "Submitting…" : "Confirm & Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Save, Check, Briefcase } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import axios from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

interface EvaluationState {
  knowledge: string;
  skills: string;
  attributes: string;
  outcomesInitiatives: string;
  selfBranching: string;
  teamPerformance: string;
  comments: string;
}

const EMPTY_EVAL: EvaluationState = {
  knowledge: "",
  skills: "",
  attributes: "",
  outcomesInitiatives: "",
  selfBranching: "",
  teamPerformance: "",
  comments: "",
};

const MAX: Record<string, number> = {
  knowledge: 20,
  skills: 20,
  attributes: 10,
  outcomesInitiatives: 20,
  selfBranching: 10,
  teamPerformance: 20,
};

const CRITERIA = [
  { key: "knowledge", label: "Knowledge", max: 20, color: "border-l-amber-400", description: "Subject knowledge, research background, and academic credentials." },
  { key: "skills", label: "Skills", max: 20, color: "border-l-blue-400", description: "Teaching skills, communication, methodology, and pedagogical approach." },
  { key: "attributes", label: "Attributes", max: 10, color: "border-l-red-400", description: "Professional behavior, punctuality, and interpersonal skills." },
  { key: "outcomesInitiatives", label: "Outcomes and Initiatives", max: 20, color: "border-l-yellow-400", description: "Research output, innovative teaching methods, and initiatives." },
  { key: "selfBranching", label: "Self Branching", max: 10, color: "border-l-blue-400", description: "Professional development and continuous learning efforts." },
  { key: "teamPerformance", label: "Team Performance", max: 20, color: "border-l-red-400", description: "Collaboration with colleagues and contribution to team goals." },
];

function DirectorInteractionEvaluationContent({ facultyId }: { facultyId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "pccoe";
  const externalId = searchParams.get("externalId") ?? "";
  const { toast } = useToast();
  const { token } = useAuth();

  const [evaluation, setEvaluation] = useState<EvaluationState>({ ...EMPTY_EVAL });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Check if director already evaluated this faculty-external pair
  useEffect(() => {
    if (!token || !externalId) return;
    (async () => {
      try {
        const res = await axios.get(
          `${BACKEND}/interaction/${department}/evaluation/${externalId}/${facultyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success && res.data.data?.directorEvaluation?.evaluatorId) {
          const d = res.data.data.directorEvaluation;
          setEvaluation({
            knowledge: String(d.knowledge ?? ""),
            skills: String(d.skills ?? ""),
            attributes: String(d.attributes ?? ""),
            outcomesInitiatives: String(d.outcomesInitiatives ?? ""),
            selfBranching: String(d.selfBranching ?? ""),
            teamPerformance: String(d.teamPerformance ?? ""),
            comments: d.comments ?? "",
          });
          setAlreadySubmitted(true);
        }
      } catch {
        // Evaluation doesn't exist yet — that's fine
      }
    })();
  }, [token, externalId, facultyId, department]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name in MAX) {
      const clamped = value === "" ? "" : String(Math.min(MAX[name], Math.max(0, parseInt(value) || 0)));
      setEvaluation((prev) => ({ ...prev, [name]: clamped }));
    } else {
      setEvaluation((prev) => ({ ...prev, [name]: value }));
    }
  };

  const calcTotal = () =>
    (["knowledge", "skills", "attributes", "outcomesInitiatives", "selfBranching", "teamPerformance"] as const)
      .reduce((sum, k) => sum + (parseInt(evaluation[k]) || 0), 0);

  const handleSubmit = async () => {
    const missing = Object.keys(MAX).filter((f) => evaluation[f as keyof EvaluationState] === "");
    if (missing.length > 0) {
      toast({ title: "Incomplete", description: "Please fill in all criteria.", variant: "destructive" });
      return;
    }

    if (!externalId) {
      toast({ title: "Error", description: "External reviewer ID missing.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(
        `${BACKEND}/interaction/${department}/evaluate/director/${externalId}/${facultyId}`,
        {
          knowledge: parseInt(evaluation.knowledge),
          skills: parseInt(evaluation.skills),
          attributes: parseInt(evaluation.attributes),
          outcomesInitiatives: parseInt(evaluation.outcomesInitiatives),
          selfBranching: parseInt(evaluation.selfBranching),
          teamPerformance: parseInt(evaluation.teamPerformance),
          comments: evaluation.comments,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast({ title: "Evaluation submitted", description: "Director interaction marks saved successfully." });
        router.push("/director/assign-external");
      } else {
        toast({ title: "Error", description: response.data.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to submit evaluation.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="bg-indigo-700 px-6 py-4 text-white">
        <h1 className="text-xl font-bold">Director Interaction Evaluation</h1>
        <p className="text-indigo-200 text-sm mt-0.5">
          Evaluating <span className="font-mono font-semibold">{facultyId}</span>
          {externalId && <> · External: <span className="font-mono">{externalId}</span></>}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-indigo-600 hover:text-indigo-800 -ml-2"
          onClick={() => router.push("/director/assign-external")}
        >
          <ArrowLeft size={15} className="mr-1" /> Back
        </Button>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <Card className="border bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 shrink-0">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Faculty ID: {facultyId}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Briefcase size={14} className="text-indigo-600" />
                      External: {externalId || "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {CRITERIA.map((c) => (
            <motion.div key={c.key} variants={itemVariants} className="mt-4">
              <Card className={`border-l-4 ${c.color} border border-border bg-muted/30`}>
                <CardContent className="p-6">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {c.label} <span className="text-sm font-normal text-muted-foreground">(Max {c.max} marks)</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      name={c.key}
                      value={evaluation[c.key as keyof EvaluationState]}
                      onChange={handleChange}
                      min={0}
                      max={c.max}
                      placeholder={`0–${c.max}`}
                      className="w-24"
                      disabled={alreadySubmitted}
                    />
                    <span className="text-sm text-muted-foreground">/ {c.max}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div variants={itemVariants} className="mt-4">
            <Card className="border-l-4 border-l-amber-400 border border-border bg-muted/30">
              <CardContent className="p-6">
                <h3 className="text-base font-semibold text-foreground mb-1">Additional Comments</h3>
                <Textarea
                  name="comments"
                  value={evaluation.comments}
                  onChange={handleChange}
                  placeholder="Additional feedback or comments..."
                  className="h-32 mt-2"
                  disabled={alreadySubmitted}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-4">
            <Card className="border bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-base font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Total Score</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{calcTotal()}</span>
                  <span className="text-lg text-indigo-500">/ 100</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 flex justify-end border-t pt-4 gap-3">
            {alreadySubmitted && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1 mr-auto">
                ✓ Evaluation already submitted
              </span>
            )}
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmOpen(true)}
              disabled={saving || alreadySubmitted}
            >
              <Check size={15} className="mr-2" /> {alreadySubmitted ? "Already Submitted" : "Submit Evaluation"}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be changed after submission. Confirm director interaction evaluation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Submitting…" : "Confirm Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DirectorInteractionEvaluationPage({ params }: { params: { facultyId: string } }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DirectorInteractionEvaluationContent facultyId={params.facultyId} />
    </Suspense>
  );
}

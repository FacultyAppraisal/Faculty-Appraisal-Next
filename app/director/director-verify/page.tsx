"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { ArrowLeft, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface SectionTotal {
  section: string;
  label: string;
  claimed: number;
  verified: number;
}

interface FacultyVerifyData {
  name: string;
  department: string;
  designation: string;
  selfScore: number;
  hodMarks: number | null;
  deanMarks: number | null;
  directorMarks: number | null;
  sections: SectionTotal[];
}

function DirectorVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const facultyId = searchParams.get("facultyId") ?? "";
  const department = searchParams.get("department") ?? "";

  const [data, setData] = useState<FacultyVerifyData | null>(null);
  const [directorMarks, setDirectorMarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!facultyId || !department) return;
    // TODO: GET /api/${department}/total_marks/${facultyId}
    // setData(response);
  }, [facultyId, department]);

  const handleConfirm = async () => {
    const marks = parseInt(directorMarks);
    if (isNaN(marks) || marks < 0 || marks > 60) {
      toast({ title: "Invalid marks", description: "Director marks must be between 0 and 60.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // TODO: POST /api/${department}/${facultyId}/D   { directorMarks: marks }
      // TODO: POST /api/${department}/${facultyId}/director-mark-given
      toast({ title: "Verification completed", description: "Director marks saved and portfolio verified." });
      router.push("/director/faculty-forms");
    } catch {
      toast({ title: "Error", description: "Failed to save director marks.", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-indigo-600 hover:text-indigo-800 -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft size={15} className="mr-1" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Director Verification</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Faculty ID: {facultyId} · {department}</p>
        </div>

        <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
          {!facultyId ? (
            /* No faculty selected — show guidance */
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <p className="text-muted-foreground">
                    No faculty selected. Please navigate here from the HOD or Dean forms page.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => router.push("/director/hod-forms")}>
                      HOD Forms
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/director/dean-forms")}>
                      Dean Forms
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : !data ? (
            /* Faculty selected but data not loaded */
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading faculty data…
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Data loaded — show summary + marks input */
            <>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Section Marks Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium text-muted-foreground">Section</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Claimed</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Verified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.sections.map((s) => (
                            <tr key={s.section} className="border-b last:border-0">
                              <td className="py-2 font-medium">{s.label}</td>
                              <td className="py-2 text-right font-mono">{s.claimed}</td>
                              <td className="py-2 text-right font-mono text-green-600 font-semibold">{s.verified}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      {[
                        { label: "Self Score", value: data.selfScore },
                        { label: "HOD Marks", value: data.hodMarks ?? "—" },
                        { label: "Dean Marks", value: data.deanMarks ?? "—" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-lg font-bold mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Director marks input */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Director Portfolio Marks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="directorMarks">Director Marks (max 60)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="directorMarks"
                          type="number"
                          min={0}
                          max={60}
                          placeholder="0–60"
                          value={directorMarks}
                          onChange={(e) => setDirectorMarks(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">/ 60</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button variant="outline" onClick={() => router.back()}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setConfirmOpen(true)}
                        disabled={!directorMarks || submitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm & Verify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Director Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to confirm portfolio verification with {directorMarks} director marks for faculty {facultyId}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "Submitting…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DirectorVerifyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DirectorVerifyContent />
    </Suspense>
  );
}

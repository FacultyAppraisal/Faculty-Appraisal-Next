"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, X, Users, UserCheck, Save, RefreshCw, Crown, CheckCircle, FileText, ArrowRight, UserPlus, ShieldCheck } from "lucide-react";
import Loader from "@/components/loader";
import { StatCard } from "@/components/stat-card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExternalEvaluator {
  _id: string;
  full_name: string;
  desg: string;
  organization: string;
  mail: string;
}

interface InternalFaculty {
  id: string;
  name: string;
  designation: string;
  role: string;
  isHodMarksGiven?: boolean;
  hod_total_marks?: number;
}

interface Dean {
  id: string;
  name: string;
  designation: string;
  role: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AssignFacultyExternalPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const dept = user?.department;

  const [externals, setExternals] = useState<ExternalEvaluator[]>([]);
  const [internalFaculty, setInternalFaculty] = useState<InternalFaculty[]>([]);
  const [deans, setDeans] = useState<Dean[]>([]);

  // assignments: externalId → array of faculty objects
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  // deanAssignments: externalId → { dean_id: string }
  const [deanAssignments, setDeanAssignments] = useState<Record<string, any>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deanDialogOpen, setDeanDialogOpen] = useState(false);
  const [activeExternal, setActiveExternal] = useState<ExternalEvaluator | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Currently staged selection inside the faculty assignment modal
  const [staged, setStaged] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try {
      const [extRes, facRes, deansRes, assignRes, deanAssignRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hod/${dept}/get-externals`),
        axios.get(`${API_BASE}/api/users`), // Assuming this returns all, we filter below
        axios.get(`${API_BASE}/api/hod/${dept}/interaction-deans`),
        axios.get(`${API_BASE}/api/hod/${dept}/external-assignments`),
        axios.get(`${API_BASE}/api/hod/${dept}/external-dean-assignments`)
      ]);

      if (extRes.data.success) setExternals(extRes.data.data);

      // Filter internal faculty by dept and role (not HOD, and allowed roles)
      const allowedRoles = ["Professor", "Associate Professor", "Assistant Professor"];
      const filteredFac = (facRes.data || []).filter((f: any) =>
        f.dept === dept && f.role !== "HOD" && allowedRoles.includes(f.role)
      ).map((f: any) => ({
        id: f._id,
        name: f.name,
        designation: f.desg,
        role: f.role,
        isHodMarksGiven: f.isHodMarksGiven,
        hod_total_marks: f.hod_total_marks
      }));
      setInternalFaculty(filteredFac);

      if (deansRes.data.success) {
        setDeans(deansRes.data.deans.map((d: any) => ({
          id: d._id,
          name: d.name,
          designation: d.desg || "Dean",
          role: d.role
        })));
      }

      if (assignRes.data.success) setAssignments(assignRes.data.data || {});
      if (deanAssignRes.data.success) setDeanAssignments(deanAssignRes.data.data || {});

    } catch (error) {
      console.error("Error fetching assignment data:", error);
      toast({ title: "Error", description: "Failed to load assignment data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dept, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (ext: ExternalEvaluator) => {
    setActiveExternal(ext);
    // Initialize staged with current assignments for this external
    const currentFacIds = (assignments[ext._id]?.assigned_faculty || []).map((f: any) => f._id);
    setStaged(new Set(currentFacIds));
    setModalSearch("");
    setDialogOpen(true);
  };

  const openDeanModal = (ext: ExternalEvaluator) => {
    setActiveExternal(ext);
    setDeanDialogOpen(true);
  };

  const modalFaculty = useMemo(
    () =>
      internalFaculty.filter(
        (f) =>
          f.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
          f.id.toLowerCase().includes(modalSearch.toLowerCase())
      ),
    [internalFaculty, modalSearch]
  );

  const toggleStaged = (id: string) => {
    setStaged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (!activeExternal || !dept) return;
    setSaving(true);
    try {
      const payload = {
        external_assignments: {
          [activeExternal._id]: Array.from(staged)
        }
      };
      const response = await axios.post(`${API_BASE}/api/hod/${dept}/assign-externals`, payload);
      if (response.data.success) {
        toast({ title: "Assignments saved", description: `Faculty assigned to ${activeExternal.full_name}.` });
        fetchData();
        setDialogOpen(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to save assignments.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDean = async (deanId: string) => {
    if (!activeExternal || !dept) return;
    setSaving(true);
    try {
      const response = await axios.post(`${API_BASE}/api/hod/${dept}/dean-external-assignment/${activeExternal._id}/${deanId}`);
      if (response.data.success) {
        toast({ title: "Dean assigned", description: `Dean assigned to ${activeExternal.full_name}.` });
        fetchData();
        setDeanDialogOpen(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to assign dean.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getFacultyNames = (ids: string[]) =>
    ids.map((id) => internalFaculty.find((f) => f.id === id)?.name ?? id);

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {loading ? (
          <Loader variant="page" message="Loading external evaluators and assignments..." />
        ) : externals.length === 0 ? (
          <motion.div variants={itemVariants} className="flex justify-center py-12">
            <Empty className="max-w-md border-border/40 bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No External Evaluators</EmptyTitle>
                <EmptyDescription>
                  No external evaluators found for your department. Go to
                  <strong> Add External Faculty</strong> first to register evaluators.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                onClick={() => router.push("/hod/add-external-faculty")}
                className="gap-2"
              >
                <Plus size={14} /> Add External Faculty
              </Button>
            </Empty>
          </motion.div>
        ) : (
          <>
            {/* Stats Row */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Registered Externals"
                value={externals.length}
                icon={Users}
                color="primary"
              />
              <StatCard
                title="Faculty Assigned"
                value={Object.values(assignments).reduce((acc, curr) => acc + (curr?.assigned_faculty?.length || 0), 0)}
                icon={UserPlus}
                color="secondary"
              />
              <StatCard
                title="Deans Linked"
                value={Object.keys(deanAssignments).length}
                icon={ShieldCheck}
                color="accent"
              />
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              variants={containerVariants}
            >
              {externals.map((ext) => {
                const assignmentData = assignments[ext._id] || {};
                const assignedFaculty = assignmentData.assigned_faculty || [];
                const assignedDeanId = deanAssignments[ext._id]?.dean_id;
                const assignedDean = deans.find(d => d.id === assignedDeanId);

                return (
                  <motion.div key={ext._id} variants={itemVariants}>
                    <Card className="border shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 h-full flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                              <div className="h-4 w-1 bg-primary rounded-full" />
                              {ext.full_name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{ext.desg}</p>
                            <p className="text-xs text-muted-foreground truncate">{ext.organization}</p>

                            {assignedDean ? (
                              <div className="mt-2 flex items-center">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-2 gap-1">
                                  <Crown size={10} /> Dean: {assignedDean.name}
                                </Badge>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic mt-1 font-medium">No dean assigned</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {assignedFaculty.length} assigned
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between gap-4">
                        {/* Assigned faculty list */}
                        <div className="min-h-[4rem] space-y-2">
                          {assignedFaculty.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {assignedFaculty.map((f: any) => (
                                <div
                                  key={f._id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <UserCheck size={12} className="text-primary shrink-0" />
                                    <span className="text-[11px] font-medium truncate">{f.name}</span>
                                  </div>

                                  {assignedDeanId && (
                                    f.isHodMarksGiven ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0 px-1.5 gap-1 shrink-0">
                                        <CheckCircle size={9} /> {f.hod_total_marks}
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="h-6 px-2 text-[9px] bg-green-600 hover:bg-green-700 gap-1 shrink-0"
                                        onClick={() => router.push(`/hod/evaluate/${f._id}`)}
                                      >
                                        <FileText size={10} /> Evaluate
                                      </Button>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No faculty assigned yet.</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 text-[11px] h-8 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => openDeanModal(ext)}
                          >
                            <Crown size={12} />
                            {assignedDeanId ? "Change Dean" : "Assign Dean"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 text-[11px] h-8"
                            disabled={!!assignedDeanId}
                            onClick={() => openModal(ext)}
                            title={assignedDeanId ? "Cannot change assignments after dean is assigned" : ""}
                          >
                            <Plus size={12} />
                            Manage Faculty
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Faculty Assignment Modal */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Assign Faculty to <span className="text-primary">{activeExternal?.full_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={15} />
              <Input
                placeholder="Search faculty…"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {internalFaculty.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No faculty found in your department.
                </p>
              ) : modalFaculty.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No results for "{modalSearch}".
                </p>
              ) : (
                modalFaculty.map((f) => {
                  const checked = staged.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleStaged(f.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${checked
                        ? "bg-primary/10 border border-primary/30 text-foreground"
                        : "bg-muted/40 hover:bg-muted border border-transparent"
                        }`}
                    >
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-semibold truncate">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground">{f.designation}</span>
                      </div>
                      {checked && <UserCheck size={16} className="text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{staged.size} faculty selected</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="px-6">Cancel</Button>
            <Button onClick={handleSaveAssignments} disabled={saving} className="gap-2 px-6">
              {saving ? <Loader variant="inline" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dean Assignment Modal */}
      <Dialog open={deanDialogOpen} onOpenChange={(o) => !o && setDeanDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Crown className="text-amber-500" size={18} /> Assign Dean Evaluator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Assigning a Dean to <strong>{activeExternal?.full_name}</strong> will lock the faculty assignments and enable evaluation mode.
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {deans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No eligible Deans found for your department.
                </p>
              ) : (
                deans.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleAssignDean(d.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm bg-muted/40 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-900 border border-transparent transition-all duration-200 group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-bold">{d.name}</span>
                      <span className="text-[10px] opacity-70">{d.designation} • {d.role}</span>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeanDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

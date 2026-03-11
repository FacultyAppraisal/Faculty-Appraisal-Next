"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, X, Users, UserCheck, Save, RefreshCw,
  Crown, CheckCircle, UserPlus, ClipboardList,
} from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import axios from "axios";
import Loader from "@/components/loader";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const DIRECTOR_DEPT = "pccoe";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssignedFaculty {
  _id: string;
  name: string;
  desg: string;
}

interface ExternalEvaluator {
  userId: string;
  full_name: string;
  desg: string;
  organization: string;
  mail: string;
  assignedFaculties: AssignedFaculty[];
}

interface HodDean {
  userId: string;
  name: string;
  role: string;
  department?: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirectorAssignExternalPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  const router = useRouter();

  const [externals, setExternals] = useState<ExternalEvaluator[]>([]);
  const [hodsDeans, setHodsDeans] = useState<HodDean[]>([]);
  const [loading, setLoading] = useState(true);

  // Faculty assignment modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExternal, setSelectedExternal] = useState<ExternalEvaluator | null>(null);
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch externals (pccoe) and all HODs/Deans for assignment
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [extRes, hodRes, deanRes] = await Promise.all([
        axios.get(`${API_BASE}/interaction/${DIRECTOR_DEPT}/get-externals`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/appraisal/by-role/hod`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/appraisal/by-role/dean`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setExternals(extRes.data.data || []);

      // Combine HODs and Deans into one list
      const hods = (hodRes.data.data || []).map((a: any) => ({
        userId: a.userId,
        name: a.name || a.userId,
        role: "hod",
        department: a.department,
      }));
      const deans = (deanRes.data.data || []).map((a: any) => ({
        userId: a.userId,
        name: a.name || a.userId,
        role: "dean",
        department: a.department,
      }));
      setHodsDeans([...hods, ...deans]);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if a faculty is assigned to a DIFFERENT external
  const isAssignedToOther = (facultyId: string, currentExtId: string) =>
    externals.some(
      (ext) =>
        ext.userId !== currentExtId &&
        ext.assignedFaculties.some((f) => f._id === facultyId)
    );

  const openModal = (ext: ExternalEvaluator) => {
    setSelectedExternal(ext);
    setStagedIds(new Set(ext.assignedFaculties.map((f) => f._id)));
    setSearch("");
    setModalOpen(true);
  };

  const toggleStaged = (id: string, blocked: boolean) => {
    if (blocked) return;
    setStagedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedExternal || !token) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE}/interaction/${DIRECTOR_DEPT}/external/${selectedExternal.userId}/assign-faculties`,
        { facultyUserIds: Array.from(stagedIds) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "HODs/Deans assigned successfully" });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: err.response?.data?.message || "Failed to assign",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (extUserId: string, facId: string) => {
    if (!token) return;
    const ext = externals.find((e) => e.userId === extUserId);
    if (!ext) return;
    const remaining = ext.assignedFaculties
      .filter((f) => f._id !== facId)
      .map((f) => f._id);

    try {
      await axios.put(
        `${API_BASE}/interaction/${DIRECTOR_DEPT}/external/${extUserId}/assign-faculties`,
        { facultyUserIds: remaining },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Assignment removed" });
      fetchData();
    } catch {
      toast({ title: "Failed to remove assignment", variant: "destructive" });
    }
  };

  const filteredHodsDeans = useMemo(() => {
    if (!search) return hodsDeans;
    const q = search.toLowerCase();
    return hodsDeans.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.userId.toLowerCase().includes(q) ||
        h.role.toLowerCase().includes(q)
    );
  }, [hodsDeans, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign HODs / Deans to External Reviewers
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {externals.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No external reviewers registered yet. Add externals first from the
              &quot;Add External&quot; page.
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        externals.map((ext) => (
          <motion.div key={ext.userId} variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{ext.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ext.desg} · {ext.organization} · {ext.mail}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openModal(ext)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Assign HODs/Deans
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {ext.assignedFaculties.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">
                    No HODs or Deans assigned yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ext.assignedFaculties.map((f) => (
                      <div
                        key={f._id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{f.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({f.desg || "—"})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() =>
                              router.push(
                                `/director/interaction-evaluation/${f._id}?department=pccoe&externalId=${ext.userId}`
                              )
                            }
                          >
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            Evaluate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemove(ext.userId, f._id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}

      {/* ── Assign Modal ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign to {selectedExternal?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search HODs / Deans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {filteredHodsDeans.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                No HODs/Deans found
              </p>
            ) : (
              filteredHodsDeans.map((h) => {
                const blocked = isAssignedToOther(h.userId, selectedExternal?.userId || "");
                const checked = stagedIds.has(h.userId);
                return (
                  <div
                    key={h.userId}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${blocked ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    onClick={() => toggleStaged(h.userId, blocked)}
                  >
                    <Checkbox checked={checked} disabled={blocked} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.userId} · {h.role.toUpperCase()}
                        {h.department ? ` · ${h.department}` : ""}
                      </p>
                    </div>
                    {blocked && (
                      <Badge variant="outline" className="text-[10px]">
                        Assigned elsewhere
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving..." : "Save Assignments"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

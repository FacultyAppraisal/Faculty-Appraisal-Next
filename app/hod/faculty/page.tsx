"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Status config ────────────────────────────────────────────────────────────

type StatusKey =
  | "pending"
  | "verification_pending"
  | "marks_verification_pending"
  | "interaction_pending"
  | "portfolio_mark_pending"
  | "completed"
  | "sent_to_director";

const STATUS_CONFIG: Record<StatusKey, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | null; className: string }> = {
  pending:                         { label: "Pending",                    variant: "outline",      className: "border-gray-400 text-gray-600" },
  verification_pending:            { label: "Verification Pending",       variant: "secondary",    className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  marks_verification_pending:      { label: "Marks Verification Pending", variant: "secondary",    className: "bg-orange-100 text-orange-800 border-orange-300" },
  interaction_pending:             { label: "Interaction Pending",        variant: "secondary",    className: "bg-blue-100 text-blue-800 border-blue-300" },
  portfolio_mark_pending:          { label: "Portfolio Marks Pending",    variant: "secondary",    className: "bg-purple-100 text-purple-800 border-purple-300" },
  completed:                       { label: "Completed",                  variant: "default",      className: "bg-green-100 text-green-800 border-green-300" },
  sent_to_director:                { label: "Sent to Director",           variant: "default",      className: "bg-indigo-100 text-indigo-800 border-indigo-300" },
};

function StatusBadge({ status }: { status: string }) {
  const key = (status?.toLowerCase().replace(/ /g, "_") ?? "pending") as StatusKey;
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG["pending"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Mock data shape (replace with real fetch) ────────────────────────────────

interface FacultyRow {
  id: string;
  name: string;
  designation: "Professor" | "Associate Professor" | "Assistant Professor";
  status: StatusKey;
  marks: number | null;
}

type SortKey = "name" | "marks";
type SortDir = "asc" | "desc";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HodFacultyPage() {
  const { user, token } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [designationFilter, setDesignationFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });
  const [data, setData] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appraisals by department
  useEffect(() => {
    const fetchAppraisals = async () => {
      
      if (!user?.department || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {

        // Fetch appraisals for the department
        const response = await axios.get(
          `${BACKEND}/appraisal/department/${encodeURIComponent(user.department)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Appraisals response:", response.data);

        if (response.data.success) {
          // Map backend data to FacultyRow format
          const appraisals = response.data.data || [];
          console.log("Raw appraisals data:", appraisals.map((a: any) => ({ userId: a.userId, status: a.status })));
          
          const facultyRows: FacultyRow[] = appraisals.map((appraisal: any) => {
            // Normalize status string and map to StatusKey
            const normalizeStatus = (status: string): StatusKey => {
              if (!status) return "pending";
              const normalized = status.toLowerCase().trim().replace(/\s+/g, "_");
              
              // Map normalized backend status to frontend StatusKey
              const statusMap: Record<string, StatusKey> = {
                "pending": "pending",
                "verification_pending": "verification_pending",
                "portfolio_marks_pending": "portfolio_mark_pending",
                "interaction_pending": "interaction_pending",
                "marks_verification_pending": "marks_verification_pending",
                "completed": "completed",
                "sent_to_director": "sent_to_director",
              };
              
              return statusMap[normalized] || "pending";
            };

            const status = normalizeStatus(appraisal.status);

            return {
              id: appraisal.userId,
              name: appraisal.userId, // Will be displayed as userId for now
              designation: appraisal.designation,
              status,
              marks: appraisal.summary?.grandTotalVerified ?? null,
            };
          });

          setData(facultyRows);
        } else {
          setError(response.data.message || "Failed to fetch appraisals");
        }
      } catch (err: any) {
        console.error("Error fetching appraisals:", err);
        setError(err.response?.data?.message || "Failed to fetch appraisals");
      } finally {
        setLoading(false);
      }
    };

    fetchAppraisals();
  }, [user?.department, token]);

  const toggleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortConfig.key === col ? (
      sortConfig.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    ) : (
      <ChevronDown size={14} className="opacity-30" />
    );

  const filtered = useMemo(() => {
    return data
      .filter((f) => {
        const matchSearch =
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || f.status === statusFilter;
        const matchDesig = designationFilter === "all" || f.designation === designationFilter;
        return matchSearch && matchStatus && matchDesig;
      })
      .sort((a, b) => {
        const dir = sortConfig.dir === "asc" ? 1 : -1;
        if (sortConfig.key === "marks") return ((a.marks ?? 0) - (b.marks ?? 0)) * dir;
        return a.name.localeCompare(b.name) * dir;
      });
  }, [data, search, statusFilter, designationFilter, sortConfig]);

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<string, number> = { total: data.length };
    data.forEach((f) => { counts[f.status] = (counts[f.status] ?? 0) + 1; });
    return counts;
  }, [data]);

  const summaryCards = [
    { label: "Total Faculty", value: summary.total ?? 0, cls: "bg-card border" },
    { label: "Completed",     value: summary.completed ?? 0,  cls: "bg-green-50 dark:bg-green-900/20 border-green-200" },
    { label: "Pending",       value: summary.pending ?? 0, cls: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200" },
    { label: "Sent to Director", value: summary.sent_to_director ?? 0, cls: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200" },
  ];

  if (loading) {
    return <Loader message="Loading faculty appraisals..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold mb-2">Error</p>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Summary strip */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryCards.map((c) => (
          <motion.div key={c.label} variants={itemVariants}>
            <Card className={`border ${c.cls}`}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{c.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3 mb-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((k) => (
              <SelectItem key={k} value={k}>{STATUS_CONFIG[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={designationFilter} onValueChange={setDesignationFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            <SelectItem value="Professor">Professor</SelectItem>
            <SelectItem value="Associate Professor">Associate Professor</SelectItem>
            <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border border-border overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                <span className="inline-flex items-center gap-1">
                  Faculty <SortIcon col="name" />
                </span>
              </TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort("marks")}
              >
                <span className="inline-flex items-center gap-1 float-right">
                  Marks <SortIcon col="marks" />
                </span>
              </TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  {data.length === 0
                    ? "No faculty data yet. Data will appear once loaded from the server."
                    : "No results match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <p className="font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.id}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.designation}</TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell className="text-right font-semibold">
                    {f.marks !== null ? f.marks.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "portfolio_mark_pending" && (
                      <Button size="sm" variant="default" className="gap-1.5">
                        Mark Portfolio
                      </Button>
                    )}
                    {f.status === "marks_verification_pending" && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                        Verify Marks
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </>
  );
}

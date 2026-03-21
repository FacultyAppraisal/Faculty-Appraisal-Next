"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search, ChevronUp, ChevronDown, CheckCircle, Filter, Send,
  FileText, ExternalLink, Eye,
} from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";
import axios from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacultyMarks {
  id: string;
  name: string;
  department: string;
  designation: string;
  role: string;
  verified_marks: number;
  portfolio_marks: number;
  total_marks: number;
}

type SortKey = keyof Pick<FacultyMarks, "name" | "verified_marks" | "portfolio_marks" | "total_marks">;
type SortDir = "asc" | "desc";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SentAppraisalsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<FacultyMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [minMarks, setMinMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${BACKEND}/appraisal/sent-to-director`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const appraisals = res.data.data || [];
          const rows: FacultyMarks[] = appraisals.map((a: any) => {
            const verifiedMarks = a.summary?.grandTotalVerified || 0;
            const portfolioMarks = a.partD?.hodMarks || a.partD?.deanMarks || 0;
            return {
              id: a.userId,
              name: a.name || a.userId,
              department: a.department || "Unknown",
              designation: a.designation,
              role: a.role,
              verified_marks: verifiedMarks,
              portfolio_marks: portfolioMarks,
              total_marks: verifiedMarks + portfolioMarks,
            };
          });
          setData(rows);
        } else {
          setError(res.data.message || "Failed to fetch appraisals");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch appraisals");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const toggleSort = (key: SortKey) =>
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortConfig.key === col ? (
      sortConfig.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    ) : (
      <ChevronDown size={14} className="opacity-30" />
    );

  const filtered = useMemo(() => {
    return data
      .filter((f) => {
        const searchMatch =
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.id.toLowerCase().includes(search.toLowerCase());
        const marksMatch =
          (!minMarks || f.total_marks >= Number(minMarks)) &&
          (!maxMarks || f.total_marks <= Number(maxMarks));
        return searchMatch && marksMatch;
      })
      .sort((a, b) => {
        const dir = sortConfig.dir === "asc" ? 1 : -1;
        if (sortConfig.key === "name") return a.name.localeCompare(b.name) * dir;
        return ((a[sortConfig.key] as number) - (b[sortConfig.key] as number)) * dir;
      });
  }, [data, search, sortConfig, minMarks, maxMarks]);

  const handleViewPDF = async (userId: string) => {
    setPdfLoading(userId);
    const newTab = window.open("about:blank", "_blank");
    try {
      const res = await axios.get(`${BACKEND}/appraisal/${userId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data?.pdfUrl) {
        if (newTab) {
          newTab.location.href = res.data.data.pdfUrl;
        } else {
          window.open(res.data.data.pdfUrl, "_blank");
        }
      } else {
        newTab?.close();
        alert("Failed to generate PDF.");
      }
    } catch {
      newTab?.close();
      alert("Failed to generate PDF.");
    } finally {
      setPdfLoading(null);
    }
  };

  const summaryCards = [
    { label: "Total Received", value: data.length, icon: Send, color: "text-green-600" },
    {
      label: "Avg Verified Marks",
      value: data.length > 0 ? (data.reduce((s, f) => s + f.verified_marks, 0) / data.length).toFixed(2) : "0.00",
      icon: Filter,
      color: "text-blue-600",
    },
    {
      label: "Avg Total Marks",
      value: data.length > 0 ? (data.reduce((s, f) => s + f.total_marks, 0) / data.length).toFixed(2) : "0.00",
      icon: CheckCircle,
      color: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Summary */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryCards.map((c) => (
          <motion.div key={c.label} variants={itemVariants}>
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {c.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">{c.value}</p>
                  </div>
                  <c.icon className={`h-8 w-8 ${c.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Toolbar */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-5"
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
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min marks"
            value={minMarks}
            onChange={(e) => setMinMarks(e.target.value)}
            className="w-28"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="number"
            placeholder="Max marks"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            className="w-28"
          />
        </div>
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
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center gap-1">Name <SortIcon col="name" /></span>
              </TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("verified_marks")}>
                <span className="inline-flex items-center gap-1 float-right">Verified <SortIcon col="verified_marks" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("portfolio_marks")}>
                <span className="inline-flex items-center gap-1 float-right">Portfolio <SortIcon col="portfolio_marks" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("total_marks")}>
                <span className="inline-flex items-center gap-1 float-right">Total <SortIcon col="total_marks" /></span>
              </TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  {data.length === 0
                    ? "No appraisals have been sent by HODs yet."
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
                  <TableCell className="text-sm text-muted-foreground">{f.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.designation}</TableCell>
                  <TableCell className="text-right font-semibold">{f.verified_marks.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{f.portfolio_marks.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-blue-700">
                    {f.total_marks.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={() => router.push(`/director/sent-appraisals/${f.id}`)}
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                      >
                        <Eye size={13} /> View Summary
                      </Button>
                      <Button
                        onClick={() => handleViewPDF(f.id)}
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={pdfLoading === f.id}
                      >
                        <FileText size={13} /> {pdfLoading === f.id ? "Generating…" : "PDF"} <ExternalLink size={11} />
                      </Button>
                    </div>
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

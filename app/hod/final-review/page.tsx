"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, Send, CheckCircle, Filter } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";
import axios from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacultyData {
  userId: string;
  role: string;
  designation: string;
  department: string;
  status: string;
  summary: {
    grandTotalClaimed: number;
    grandTotalVerified: number;
  };
  partD: {
    selfAwardedMarks: number;
    hodMarks: number;
    deanMarks: number;
    totalClaimed: number;
    totalVerified: number;
  };
}

interface FacultyRow {
  id: string;
  name: string;
  designation: string;
  status: string;
  verified_marks: number;
  portfolio_marks: number;
  total_marks: number;
}

type SortKey = keyof Pick<FacultyRow, "name" | "portfolio_marks" | "total_marks">;
type SortDir = "asc" | "desc";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinalReviewPage() {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [data, setData] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<FacultyRow | null>(null);
  const [sending, setSending] = useState(false);
  const [minPortfolio, setMinPortfolio] = useState("");
  const [maxPortfolio, setMaxPortfolio] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");


  // Fetch faculty with "Completed" status
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.department || !token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `${BACKEND}/appraisal/department/${encodeURIComponent(user.department)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          const appraisals: FacultyData[] = res.data.data || [];
          const rows: FacultyRow[] = appraisals
            .filter((a) => a.status === "Completed" || a.status === "Sent to Director")
            .map((a) => {
              const verifiedMarks = a.summary?.grandTotalVerified || 0;
              const portfolioMarks = a.partD?.hodMarks || a.partD?.deanMarks || 0;
              return {
                id: a.userId,
                name: a.userId,
                designation: a.designation,
                status: a.status,
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
  }, [user?.department, token]);

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

        const portfolioMatch =
          (!minPortfolio || f.portfolio_marks >= Number(minPortfolio)) &&
          (!maxPortfolio || f.portfolio_marks <= Number(maxPortfolio));

        const totalMatch =
          (!minTotal || f.total_marks >= Number(minTotal)) &&
          (!maxTotal || f.total_marks <= Number(maxTotal));

        return searchMatch && portfolioMatch && totalMatch;
      })
      .sort((a, b) => {
        const dir = sortConfig.dir === "asc" ? 1 : -1;
        if (sortConfig.key === "name") return a.name.localeCompare(b.name) * dir;
        return ((a[sortConfig.key] as number) - (b[sortConfig.key] as number)) * dir;
      });
  }, [data, search, sortConfig, minPortfolio, maxPortfolio, minTotal, maxTotal]);

  const openConfirm = (row: FacultyRow) => {
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const handleSendToDirector = async () => {
    if (!confirmTarget) return;
    setSending(true);
    try {
      const res = await axios.patch(
        `${BACKEND}/appraisal/${confirmTarget.id}/send-to-director`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setData((prev) =>
          prev.map((f) => f.id === confirmTarget.id ? { ...f, status: "Sent to Director" } : f)
        );
        toast({
          title: "Sent to Director",
          description: `${confirmTarget.name}'s appraisal has been sent to the Director.`,
        });
        setConfirmOpen(false);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send to Director. Try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const readyCount = data.filter((f) => f.status === "Completed").length;
  const sentCount = data.filter((f) => f.status === "Sent to Director").length;

  const summaryCards = [
    { label: "Ready to Send", value: readyCount, icon: Send, color: "text-green-600" },
    { label: "Sent to Director", value: sentCount, icon: CheckCircle, color: "text-indigo-600" },
    {
      label: "Avg Total Marks",
      value: data.length > 0 ? (data.reduce((s, f) => s + f.total_marks, 0) / data.length).toFixed(2) : "0.00",
      icon: Filter,
      color: "text-blue-600",
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

        {/* Portfolio marks filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Portfolio:</span>
          <Input
            type="number"
            placeholder="Min"
            value={minPortfolio}
            onChange={(e) => setMinPortfolio(e.target.value)}
            className="w-20"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPortfolio}
            onChange={(e) => setMaxPortfolio(e.target.value)}
            className="w-20"
          />
        </div>

        {/* Total marks filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Total:</span>
          <Input
            type="number"
            placeholder="Min"
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
            className="w-20"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxTotal}
            onChange={(e) => setMaxTotal(e.target.value)}
            className="w-20"
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
                <span className="inline-flex items-center gap-1">Faculty <SortIcon col="name" /></span>
              </TableHead>
              <TableHead>Designation</TableHead>

              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("portfolio_marks")}>
                <span className="inline-flex items-center gap-1 float-right">Portfolio <SortIcon col="portfolio_marks" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("total_marks")}>
                <span className="inline-flex items-center gap-1 float-right">Total <SortIcon col="total_marks" /></span>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  {data.length === 0
                    ? "No completed appraisals ready to send to Director."
                    : "No results match the search."}
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

                  <TableCell className="text-right font-semibold">{f.portfolio_marks.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-blue-700">{f.total_marks.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {f.status === "Sent to Director" ? (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                        Sent to Director
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                        Completed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {f.status === "Sent to Director" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-indigo-700 font-medium">
                        <CheckCircle size={15} /> Sent
                      </span>
                    ) : (
                      <Button
                        onClick={() => openConfirm(f)}
                        size="sm"
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Send size={14} /> Send to Director
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      {data.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Click <strong>Send to Director</strong> to forward completed appraisals to the Director for final review.
        </p>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send size={18} className="text-primary" /> Send to Director
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You are about to send the appraisal of{" "}
            <strong className="text-foreground">{confirmTarget?.name}</strong> to the Director for
            final review.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Portfolio: <strong>{confirmTarget?.portfolio_marks.toFixed(2)}</strong> &nbsp;·&nbsp;
            Total: <strong>{confirmTarget?.total_marks.toFixed(2)}</strong>
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToDirector} disabled={sending} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Send size={14} /> {sending ? "Sending…" : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

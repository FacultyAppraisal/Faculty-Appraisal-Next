"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, CheckCircle, Filter, AlertCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
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

interface FacultyMarks {
  id: string;
  name: string;
  designation: string;
  status: string;
  verified_marks: number;
  portfolio_marks: number;
  total_marks: number;
}

type SortKey = keyof Pick<FacultyMarks, "name" | "verified_marks" | "portfolio_marks" | "total_marks">;
type SortDir = "asc" | "desc";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinalMarksPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, token } = useAuth();
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
  const [sending, setSending] = useState<string | null>(null);

  // Fetch faculty marks data
  useEffect(() => {
    const fetchFacultyMarks = async () => {
      if (!user?.department || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${BACKEND}/appraisal/department/${encodeURIComponent(user.department)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          const appraisals = response.data.data || [];
          
          // Filter and transform to show only faculty with "Completed" status
          const facultyMarks: FacultyMarks[] = appraisals
            .filter((appraisal: FacultyData) => 
              appraisal.status?.toLowerCase().replace(/\s+/g, "_") === "completed"
            )
            .map((appraisal: FacultyData) => {
              const verifiedMarks = appraisal.summary?.grandTotalVerified || 0;
              const portfolioMarks = appraisal.partD?.hodMarks || appraisal.partD?.deanMarks || 0;
              
              return {
                id: appraisal.userId,
                name: appraisal.userId,
                designation: appraisal.designation,
                status: appraisal.status,
                verified_marks: verifiedMarks,
                portfolio_marks: portfolioMarks,
                total_marks: verifiedMarks + portfolioMarks,
              };
            });

          setData(facultyMarks);
        } else {
          setError(response.data.message || "Failed to fetch faculty marks");
        }
      } catch (err: any) {
        console.error("Error fetching faculty marks:", err);
        setError(err.response?.data?.message || "Failed to fetch faculty marks");
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyMarks();
  }, [user?.department, token]);

  const toggleSort = (key: SortKey) =>
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
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

  const handleSendToDirector = async (userId: string) => {
    if (!window.confirm('Are you sure you want to send this appraisal to the Director?')) {
      return;
    }

    setSending(userId);
    try {
      const response = await axios.patch(
        `${BACKEND}/appraisal/${userId}/send-to-director`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove sent faculty from the list
        setData((prev) => prev.filter((f) => f.id !== userId));
        
        toast({ 
          title: "Sent to Director", 
          description: "Appraisal has been sent to the Director successfully." 
        });
      } else {
        throw new Error(response.data.message || "Failed to send to director");
      }
    } catch (err: any) {
      console.error("Error sending to director:", err);
      toast({ 
        title: "Error", 
        description: err.response?.data?.message || "Failed to send to director. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setSending(null);
    }
  };

  const summaryCards = [
    { label: "Ready to Send", value: data.length, icon: Send, color: "text-green-600" },
    { label: "Avg Verified Marks", value: data.length > 0 ? (data.reduce((sum, f) => sum + f.verified_marks, 0) / data.length).toFixed(2) : "0.00", icon: Filter, color: "text-blue-600" },
    { label: "Avg Total Marks", value: data.length > 0 ? (data.reduce((sum, f) => sum + f.total_marks, 0) / data.length).toFixed(2) : "0.00", icon: CheckCircle, color: "text-purple-600" },
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

        {/* Marks filter */}
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
                <span className="inline-flex items-center gap-1">
                  Faculty <SortIcon col="name" />
                </span>
              </TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("verified_marks")}>
                <span className="inline-flex items-center gap-1 float-right">
                  Verified Marks <SortIcon col="verified_marks" />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("portfolio_marks")}>
                <span className="inline-flex items-center gap-1 float-right">
                  Portfolio Marks <SortIcon col="portfolio_marks" />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("total_marks")}>
                <span className="inline-flex items-center gap-1 float-right">
                  Total Marks <SortIcon col="total_marks" />
                </span>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  {data.length === 0
                    ? "No completed appraisals ready to send to Director."
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
                  <TableCell className="text-sm text-muted-foreground">
                    {f.designation}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {f.verified_marks.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {f.portfolio_marks.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-blue-700">
                    {f.total_marks.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                      Completed
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      onClick={() => handleSendToDirector(f.id)}
                      disabled={sending === f.id}
                      size="sm"
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Send size={14} />
                      {sending === f.id ? "Sending..." : "Send to Director"}
                    </Button>
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
    </>
  );
}

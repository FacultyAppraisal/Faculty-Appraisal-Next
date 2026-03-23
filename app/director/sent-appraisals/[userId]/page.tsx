"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";
import axios from "axios";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

const SECTION_META = [
  { key: "partA", label: "Part A", subtitle: "Academic Involvement" },
  { key: "partB", label: "Part B", subtitle: "Research & Development" },
  { key: "partC", label: "Part C", subtitle: "Self Development" },
  { key: "partD", label: "Part D", subtitle: "Portfolio" },
  { key: "partE", label: "Part E", subtitle: "Extraordinary Contribution" },
] as const;

export default function AppraisalSummaryPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [data, setData] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const fetchAppraisal = async () => {
      if (!token || !userId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await axios.get(`${BACKEND}/appraisal/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setData(res.data.data);
          setUserName(res.data.data.userId);
        } else {
          setError(res.data.message || "Failed to fetch appraisal");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch appraisal");
      } finally {
        setLoading(false);
      }
    };
    fetchAppraisal();
  }, [userId, token]);

  const handleViewPDF = async () => {
    setPdfLoading(true);
    // Open tab synchronously to avoid popup blocker (user gesture context)
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
        alert("Failed to generate PDF. Please try again.");
      }
    } catch {
      newTab?.close();
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50 max-w-md mx-auto mt-20">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error || "Appraisal not found"}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              <ArrowLeft size={14} className="mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grandClaimed = data.summary?.grandTotalClaimed || 0;
  const grandVerified = data.summary?.grandTotalVerified || 0;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/director/sent-appraisals")}
        >
          <ArrowLeft size={16} /> Back to Sent Appraisals
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appraisal Summary</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {userName} · {data.designation} · {data.role?.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300 text-sm px-3 py-1">
              {data.status}
            </Badge>
            <Button onClick={handleViewPDF} size="sm" variant="outline" className="gap-2" disabled={pdfLoading}>
              <FileText size={14} /> {pdfLoading ? "Generating…" : "View PDF"} <ExternalLink size={12} />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Grand Total Card */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grand Total Claimed</p>
                <p className="text-3xl font-bold text-foreground mt-1">{grandClaimed.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grand Total Verified</p>
                <p className="text-3xl font-bold text-primary mt-1">{grandVerified.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Part-wise breakdown */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {SECTION_META.map((sec) => {
          const part = data[sec.key];
          const claimed = part?.totalClaimed || 0;
          const verified = part?.totalVerified || 0;
          return (
            <motion.div key={sec.key} variants={itemVariants}>
              <Card className="border h-full">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold text-center">{sec.label}</CardTitle>
                  <p className="text-xs text-muted-foreground text-center">{sec.subtitle}</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Claimed</p>
                      <p className="text-lg font-semibold">{claimed.toFixed(2)}</p>
                    </div>
                    <div className="border-t border-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Verified</p>
                      <p className="text-lg font-bold text-primary">{verified.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

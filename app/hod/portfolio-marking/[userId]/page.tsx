"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

interface PortfolioData {
  portfolioType: "institute" | "department" | "both";
  instituteLevelPortfolio: string;
  departmentLevelPortfolio: string;
  selfAwardedMarks: number;
  deanMarks: number;
  hodMarks: number;
  isMarkDean: boolean;
  isMarkHOD: boolean;
  isAdministrativeRole: boolean;
  administrativeRole: string;
  adminSelfAwardedMarks: number;
  directorMarks: number;
  adminDeanMarks: number;
  totalClaimed: number;
  totalVerified: number;
}

interface FacultyInfo {
  userId: string;
  role: string;
  designation: string;
  department: string;
  appraisalYear: number;
  status: string;
}

interface AppraisalData {
  userId: string;
  role: string;
  designation: string;
  department: string;
  appraisalYear: number;
  status: string;
  partD: PortfolioData;
}

export default function HodPortfolioMarkingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(null);
  const [hodMarks, setHodMarks] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch appraisal data
  useEffect(() => {
    const fetchAppraisalData = async () => {
      if (!token || !userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${BACKEND}/appraisal/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          const data = response.data.data;
          setAppraisalData(data);
          setHodMarks(data.partD?.hodMarks || 0);
        } else {
          setError("Failed to fetch appraisal data");
        }
      } catch (err: any) {
        console.error("Error fetching appraisal:", err);
        setError(err.response?.data?.message || "Failed to fetch appraisal data");
      } finally {
        setLoading(false);
      }
    };

    fetchAppraisalData();
  }, [token, userId]);

  // Calculate total score based on portfolio type and designation
  const calculateTotalScore = () => {
    if (!appraisalData?.partD) return 0;

    const selfScore = Math.min(60, Number(appraisalData.partD.selfAwardedMarks) || 0);
    const hodScore = Math.min(60, Number(hodMarks) || 0);

    // For administrative roles, different calculation may apply
    if (appraisalData.partD.isAdministrativeRole) {
      return 0; // Handle administrative role separately
    }

    // For Associate Deans, they get half HOD marks
    if (appraisalData.designation === "Associate Dean") {
      return Math.min(120, selfScore + hodScore / 2);
    }

    // All other faculty get full HOD marks
    return Math.min(120, selfScore + hodScore);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      // Submit HOD marks using the evaluator endpoint
      // This endpoint now automatically updates status when all required marks are complete
      await axios.put(
        `${BACKEND}/appraisal/${userId}/part-d/evaluator`,
        { marks: Number(hodMarks) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsModalOpen(false);
      router.push("/hod/faculty");
    } catch (err: any) {
      console.error("Error submitting marks:", err);
      setError(err.response?.data?.message || "Failed to submit marks");
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error && !appraisalData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => router.push("/hod/faculty")}
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Faculty List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appraisalData) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Faculty Portfolio Evaluation
            </h1>
            <p className="text-gray-600 mt-1">
              Review and mark faculty portfolio for appraisal year {appraisalData.appraisalYear}
            </p>
          </div>
          <Button
            onClick={() => router.push("/hod/faculty")}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Faculty Information Card */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Faculty Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Faculty ID", value: appraisalData.userId },
                { label: "Role", value: appraisalData.role },
                { label: "Designation", value: appraisalData.designation },
                { label: "Department", value: appraisalData.department },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm"
                >
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    {item.label}
                  </label>
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-gray-700 font-medium">
                    {item.value || "N/A"}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 border-purple-300"
              >
                Status: {appraisalData.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Portfolio Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Portfolio Type:{" "}
                  <Badge variant="outline" className="ml-2">
                    {appraisalData.partD?.portfolioType?.toUpperCase() || "NOT SPECIFIED"}
                  </Badge>
                </h3>
              </div>

              {/* Institute Level Portfolio */}
              {appraisalData.partD?.instituteLevelPortfolio && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Institute Level Portfolio
                  </h4>
                  <div className="bg-white p-4 rounded border border-gray-200 whitespace-pre-wrap">
                    {appraisalData.partD.instituteLevelPortfolio}
                  </div>
                </div>
              )}

              {/* Department Level Portfolio */}
              {appraisalData.partD?.departmentLevelPortfolio && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Department Level Portfolio
                  </h4>
                  <div className="bg-white p-4 rounded border border-gray-200 whitespace-pre-wrap">
                    {appraisalData.partD.departmentLevelPortfolio}
                  </div>
                </div>
              )}

              {/* Administrative Role Information */}
              {appraisalData.partD?.isAdministrativeRole && (
                <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 bg-amber-50">
                  <h4 className="font-medium text-amber-700 mb-2">
                    Administrative Role
                  </h4>
                  <div className="bg-white p-4 rounded border border-amber-200">
                    <p className="text-gray-700">
                      <span className="font-semibold">Role:</span>{" "}
                      {appraisalData.partD.administrativeRole || "Not specified"}
                    </p>
                    <p className="text-gray-700 mt-2">
                      <span className="font-semibold">Self Awarded Marks:</span>{" "}
                      {appraisalData.partD.adminSelfAwardedMarks || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Marking Section Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>HOD Evaluation Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col space-y-4">
                <label className="text-gray-700 font-medium">
                  Enter HOD Marks (Maximum 60)
                </label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    className="w-full md:w-1/3"
                    max="60"
                    min="0"
                    value={hodMarks}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const value = Math.min(60, Math.max(0, Number(e.target.value)));
                      setHodMarks(value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value > 60) {
                        setHodMarks(60);
                      } else if (value < 0) {
                        setHodMarks(0);
                      }
                    }}
                    required
                  />
                  <span className="text-sm text-gray-600">out of 60</span>
                </div>
              </div>

              {/* Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">
                        Category
                      </th>
                      <th className="border border-gray-300 p-3 text-center">
                        Maximum Marks
                      </th>
                      <th className="border border-gray-300 p-3 text-center">
                        Marks Awarded
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">
                        Self Awarded Marks (50% of Max)
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        60
                      </td>
                      <td className="border border-gray-300 p-3 text-center bg-gray-50 font-medium">
                        {appraisalData.partD?.selfAwardedMarks || 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">
                        HOD Evaluation Marks
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        60
                      </td>
                      <td className="border border-gray-300 p-3 text-center bg-blue-50 font-medium">
                        {hodMarks}
                      </td>
                    </tr>
                    <tr className="bg-blue-100">
                      <td colSpan={2} className="border border-gray-300 p-3 font-semibold">
                        Total Marks Obtained
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-blue-700">
                        {calculateTotalScore()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Submitting..." : "Submit Evaluation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Details cannot be changed after final submission. Are you sure you want
              to submit these marks?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Faculty ID:</span> {appraisalData.userId}
              </p>
              <p className="text-sm">
                <span className="font-semibold">HOD Marks:</span> {hodMarks} / 60
              </p>
              <p className="text-sm">
                <span className="font-semibold">Total Score:</span> {calculateTotalScore()} / 120
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

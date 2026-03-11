"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import Loader from "@/components/loader";
import { containerVariants, itemVariants } from "@/lib/animations";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

interface TotalMarksData {
    name: string;
    _id: string;
    department: string;
    designation: string;
    role: string;
    status: string;
    grand_total_marks: number;
    grand_verified_marks: number;
    section_totals: {
        A_total: number;
        A_verified_total: number;
        B_total: number;
        B_verified_total: number;
        C_total: number;
        C_verified_total: number;
        D_total: number;
        D_verified_total: number;
        E_total: number;
        E_verified_total: number;
    };
}

interface MarksData {
    claimed: {
        academic: number;
        research: number;
        selfDev: number;
        portfolio: number;
        extraOrd: number;
    };
    obtained: {
        academic: number;
        research: number;
        selfDev: number;
        portfolio: number;
        extraOrd: number;
    };
}

const MAX_MARKS = {
    academic: {
        professor: 300,
        "associate professor": 360,
        "assistant professor": 440,
    },
    research: {
        professor: 370,
        "associate professor": 300,
        "assistant professor": 210,
    },
    selfDev: {
        professor: 160,
        "associate professor": 170,
        "assistant professor": 180,
    },
    portfolio: {
        professor: 120,
        "associate professor": 120,
        "assistant professor": 120,
    },
    extraOrd: {
        professor: 50,
        "associate professor": 50,
        "assistant professor": 50,
    },
};

export default function DirectorVerifyMarksPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { token, user } = useAuth();

    const userId = params.userId as string;

    const [apiData, setApiData] = useState<TotalMarksData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [marksData, setMarksData] = useState<MarksData>({
        claimed: {
            academic: 0,
            research: 0,
            selfDev: 0,
            portfolio: 0,
            extraOrd: 0,
        },
        obtained: {
            academic: 0,
            research: 0,
            selfDev: 0,
            portfolio: 0,
            extraOrd: 0,
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${BACKEND}/appraisal/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.data.success) {
                    const appraisal = response.data.data;

                    const extraDesignationMarks = appraisal.designation === 'Associate Dean' ? 50 : 0;

                    const mappedData = {
                        name: userId,
                        _id: userId,
                        department: appraisal.role,
                        designation: appraisal.designation,
                        role: appraisal.role,
                        status: appraisal.status,
                        grand_total_marks: Math.min(1000, appraisal.summary.grandTotalClaimed + extraDesignationMarks),
                        grand_verified_marks: Math.min(1000, appraisal.summary.grandTotalVerified + extraDesignationMarks),
                        section_totals: {
                            A_total: appraisal.partA.totalClaimed,
                            A_verified_total: appraisal.partA.totalVerified,
                            B_total: appraisal.partB.totalClaimed,
                            B_verified_total: appraisal.partB.totalVerified,
                            C_total: appraisal.partC.totalClaimed,
                            C_verified_total: appraisal.partC.totalVerified,
                            D_total: appraisal.partD.totalClaimed,
                            D_verified_total: appraisal.partD.totalVerified,
                            E_total: appraisal.partE.totalClaimed,
                            E_verified_total: appraisal.partE.totalVerified
                        }
                    };

                    setApiData(mappedData);

                    setMarksData({
                        claimed: {
                            academic: mappedData.section_totals.A_total || 0,
                            research: mappedData.section_totals.B_total || 0,
                            selfDev: mappedData.section_totals.C_total || 0,
                            portfolio: mappedData.section_totals.D_total || 0,
                            extraOrd: mappedData.section_totals.E_total || 0,
                        },
                        obtained: {
                            academic: mappedData.section_totals.A_verified_total || mappedData.section_totals.A_total || 0,
                            research: mappedData.section_totals.B_verified_total || mappedData.section_totals.B_total || 0,
                            selfDev: mappedData.section_totals.C_verified_total || mappedData.section_totals.C_total || 0,
                            portfolio: mappedData.section_totals.D_verified_total || mappedData.section_totals.D_total || 0,
                            extraOrd: mappedData.section_totals.E_verified_total || mappedData.section_totals.E_total || 0,
                        },
                    });
                }
            } catch (error: any) {
                console.error("Error fetching data:", error);
                toast({
                    title: "Error",
                    description: error.response?.data?.message || "Failed to load data",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (userId && token) {
            fetchData();
        }
    }, [userId, token, toast]);

    const getMaxMarksBySection = (section: keyof typeof MAX_MARKS): number => {
        const designation = apiData?.designation?.toLowerCase() as
            | "professor"
            | "associate professor"
            | "assistant professor";
        return MAX_MARKS[section]?.[designation || "assistant professor"] || 0;
    };

    const handleInputChange = (field: keyof MarksData["obtained"], value: string) => {
        const numValue = parseFloat(value) || 0;
        const maxMarks = getMaxMarksBySection(field as any);
        const clampedValue = Math.min(Math.max(0, numValue), maxMarks);

        setMarksData((prev) => ({
            ...prev,
            obtained: {
                ...prev.obtained,
                [field]: clampedValue,
            },
        }));
    };

    const calculateTotal = (type: "claimed" | "obtained"): number => {
        const values = marksData[type];
        const sum = Object.values(values).reduce((acc, curr) => acc + curr, 0);
        const extraDesignationMarks = apiData?.designation === "Associate Dean" ? 50 : 0;
        return Math.min(1000, sum + extraDesignationMarks);
    };

    const handleSubmit = async () => {
        if (!window.confirm("Details can't be changed after the final submission. Confirm Submit?")) {
            return;
        }

        try {
            setSubmitting(true);

            const verifiedData = {
                A: { verified_marks: marksData.obtained.academic },
                B: { verified_marks: marksData.obtained.research },
                C: { verified_marks: marksData.obtained.selfDev },
                D: { verified_marks: marksData.obtained.portfolio },
                E: { verified_marks: marksData.obtained.extraOrd },
            };

            const response = await axios.post(
                `${BACKEND}/appraisal/${userId}/verify-marks`,
                verifiedData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: "Marks verified successfully!",
                });
                router.push("/director/hod-forms");
            }
        } catch (error: any) {
            console.error("Error submitting verification:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to submit verification",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader />
            </div>
        );
    }

    if (!apiData) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center text-red-600">
                    <p className="text-lg">Failed to load data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <motion.div
                className="bg-white rounded-lg shadow-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Faculty Information Section */}
                <motion.div
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200"
                    variants={itemVariants}
                >
                    <h2 className="text-xl font-semibold text-blue-800 mb-4">Faculty Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Faculty Name", value: apiData.name },
                            { label: "Faculty ID", value: apiData._id },
                            { label: "Faculty Role", value: apiData.role },
                            { label: "Designation", value: apiData.designation },
                            { label: "Department", value: apiData.department },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm min-h-[120px] flex flex-col"
                            >
                                <label className="block text-sm font-medium text-blue-700 mb-2">
                                    {item.label}
                                </label>
                                <div className="flex-1 w-full p-2 bg-blue-50 border border-blue-200 rounded-md text-gray-700 font-medium flex items-center">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Verification Summary Section */}
                <motion.div
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200"
                    variants={itemVariants}
                >
                    <h2 className="text-xl font-semibold text-blue-800 mb-4">Verification Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: "Self Awarded Marks", value: calculateTotal("claimed") },
                            { label: "Verified Marks", value: calculateTotal("obtained") },
                            {
                                label: "Approval Status",
                                value: apiData.status.replace(/_/g, " ").toUpperCase(),
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm min-h-[100px] flex flex-col"
                            >
                                <label className="block text-sm font-medium text-blue-700 mb-2">
                                    {item.label}
                                </label>
                                <div className="flex-1 w-full p-2 bg-blue-50 border border-blue-200 rounded-md text-gray-700 font-medium flex items-center justify-center">
                                    <span className="text-xl">{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Summary Marks Table */}
                <div className="overflow-x-auto mb-6">
                    <h2 className="text-xl font-bold mb-4 text-center">
                        Summary Marks Obtained/Awarded of Self Appraisal System
                    </h2>
                    <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-300 p-2">Part</th>
                                <th className="border border-gray-300 p-2">
                                    Description of Self Appraisal System Part
                                </th>
                                <th colSpan={3} className="border border-gray-300 p-2 text-center">
                                    Cadre Specific Maximum Marks
                                </th>
                                <th className="border border-gray-300 p-2">Marks Claimed by Faculty</th>
                                <th className="border border-gray-300 p-2">Marks Obtained after Verification</th>
                            </tr>
                            <tr>
                                <th className="border border-gray-300 p-2"></th>
                                <th className="border border-gray-300 p-2"></th>
                                <th className="border border-gray-300 p-2">Professor</th>
                                <th className="border border-gray-300 p-2">Associate Professor</th>
                                <th className="border border-gray-300 p-2">Assistant Professor</th>
                                <th className="border border-gray-300 p-2"></th>
                                <th className="border border-gray-300 p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2">A</td>
                                <td className="border border-gray-300 p-2">Academic Involvement</td>
                                <td className="border border-gray-300 p-2 text-center">300</td>
                                <td className="border border-gray-300 p-2 text-center">360</td>
                                <td className="border border-gray-300 p-2 text-center">440</td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.claimed.academic}
                                        readOnly
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border-2 border-green-500 rounded focus:outline-none focus:border-green-600"
                                        value={marksData.obtained.academic}
                                        min={0}
                                        max={getMaxMarksBySection("academic")}
                                        onChange={(e) => handleInputChange("academic", e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">B</td>
                                <td className="border border-gray-300 p-2">Research and Development</td>
                                <td className="border border-gray-300 p-2 text-center">370</td>
                                <td className="border border-gray-300 p-2 text-center">300</td>
                                <td className="border border-gray-300 p-2 text-center">210</td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.claimed.research}
                                        readOnly
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.obtained.research}
                                        readOnly
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">C</td>
                                <td className="border border-gray-300 p-2">Self-Development</td>
                                <td className="border border-gray-300 p-2 text-center">160</td>
                                <td className="border border-gray-300 p-2 text-center">170</td>
                                <td className="border border-gray-300 p-2 text-center">180</td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.claimed.selfDev}
                                        readOnly
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border-2 border-green-500 rounded focus:outline-none focus:border-green-600"
                                        value={marksData.obtained.selfDev}
                                        min={0}
                                        max={getMaxMarksBySection("selfDev")}
                                        onChange={(e) => handleInputChange("selfDev", e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">D</td>
                                <td className="border border-gray-300 p-2">
                                    Portfolio – Institute Level and /or Departmental Level
                                </td>
                                <td className="border border-gray-300 p-2 text-center">120</td>
                                <td className="border border-gray-300 p-2 text-center">120</td>
                                <td className="border border-gray-300 p-2 text-center">120</td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.claimed.portfolio}
                                        readOnly
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border-2 border-green-500 rounded focus:outline-none focus:border-green-600"
                                        value={marksData.obtained.portfolio}
                                        min={0}
                                        max={getMaxMarksBySection("portfolio")}
                                        onChange={(e) => handleInputChange("portfolio", e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">E</td>
                                <td className="border border-gray-300 p-2">Extra-ordinary Contribution</td>
                                <td className="border border-gray-300 p-2 text-center">50</td>
                                <td className="border border-gray-300 p-2 text-center">50</td>
                                <td className="border border-gray-300 p-2 text-center">50</td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                        value={marksData.claimed.extraOrd}
                                        readOnly
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <Input
                                        type="number"
                                        className="w-full p-1 border-2 border-green-500 rounded focus:outline-none focus:border-green-600"
                                        value={marksData.obtained.extraOrd}
                                        min={0}
                                        max={getMaxMarksBySection("extraOrd")}
                                        onChange={(e) => handleInputChange("extraOrd", e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </td>
                            </tr>
                            <tr className="font-bold bg-gray-50">
                                <td colSpan={5} className="border border-gray-300 p-2">
                                    Total* *Minimum of [1000, Claimed/Obtained Marks]
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                    {calculateTotal("claimed")}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                    {calculateTotal("obtained")}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {apiData.designation === "Associate Dean" && (
                        <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800">
                            <p className="font-medium">
                                Note: 50 extra marks have been added for designation &quot;Associate Dean&quot;.
                            </p>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-gray-600">
                        *Please Note: The Total Marks claimed by faculty/ Marks obtained after verification can
                        not exceed 1000.
                        <br />
                        (including Deputy Director/ Dean/HoD/ Associate Dean; the Total marks will be a Minimum
                        of [1000, Claimed/Obtained Marks] )
                    </p>
                </div>

                {/* Submit Button */}
                <div className="mt-6 text-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit Verification"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

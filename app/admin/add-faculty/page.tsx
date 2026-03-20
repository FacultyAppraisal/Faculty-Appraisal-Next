"use client";


import React, { useRef, useState } from "react";
import {
  Check,
  User,
} from "lucide-react";
import Loader from "@/components/loader";
import { DEPARTMENTS, ROLES, DESIGNATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import { tokenManager } from "@/lib/api-client";
import axios from "axios";

interface FormData {
  userId: string;
  name: string;
  department: string;
  role: string;
  email: string;
  mobile: string;
  designation: string;
  status: string;
  password: string;
  higherDean?: string;
  higherDeanName?: string;
  date_added: string;
  year: string;
}

interface DeanSuggestion {
  _id: string;
  name: string;
  dept: string;
}

export default function AddFacultyPage() {
  const DEAN_SUGGESTIONS_STALE_MS = 5 * 60 * 1000;
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deanSuggestions, setDeanSuggestions] = useState<DeanSuggestion[]>([]);
  const [showDeanSuggestions, setShowDeanSuggestions] = useState(false);
  const [isDeanSuggestionsLoading, setIsDeanSuggestionsLoading] = useState(false);
  const deanSuggestionsFetchedAtRef = useRef<number>(0);



  const calculateAcademicYear = (dateString: string): string => {
    if (!dateString) return "";

    const selectedDate = new Date(dateString);
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();

    if (month >= 5) {
      // June (month index 5) onwards
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const [formData, setFormData] = useState<FormData>(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    return {
      userId: "",
      name: "",
      department: "",
      role: "",
      email: "",
      mobile: "",
      designation: "",
      higherDean: "",
      higherDeanName: "",
      status: "active",
      password: "",
      date_added: formattedDate,
      year: calculateAcademicYear(formattedDate),
    };
  });

  const shouldFetchDeanSuggestions = (): boolean => {
    if (isDeanSuggestionsLoading) return false;
    if (deanSuggestions.length === 0) return true;
    const isStale = Date.now() - deanSuggestionsFetchedAtRef.current > DEAN_SUGGESTIONS_STALE_MS;
    return isStale;
  };

  const fetchDeanSuggestions = async () => {
    if (!shouldFetchDeanSuggestions()) return;

    setIsDeanSuggestionsLoading(true);
    try {
      const token = tokenManager.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.get("/api/admin/faculty", {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error("Failed to fetch faculty data");
      }

      const allFaculties = response.data;

      // Filter only deans from the response
      const deans = Array.isArray(allFaculties)
        ? allFaculties.filter((faculty: any) => faculty.role?.toLowerCase() === "dean")
        : [];

      setDeanSuggestions(deans.map((dean: any) => ({
        _id: dean._id,
        name: dean.name,
        dept: dean.department
      })));
      deanSuggestionsFetchedAtRef.current = Date.now();
    } catch (error) {
      console.error("Error fetching dean suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dean suggestions",
        variant: "destructive",
      });
      setDeanSuggestions([]);
      deanSuggestionsFetchedAtRef.current = 0;
    } finally {
      setIsDeanSuggestionsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const academicYear = calculateAcademicYear(selectedDate);

    setFormData((prev) => ({
      ...prev,
      date_added: selectedDate,
      year: academicYear,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FormData
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "userId" && { password: value }),
    }));

    if (field === "higherDeanName") {
      setShowDeanSuggestions(true);
      fetchDeanSuggestions();
    }
  };

  const handleSelectChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDeanSelect = (deanName: string, deanId: string) => {
    setFormData((prev) => ({
      ...prev,
      higherDean: deanId,
      higherDeanName: deanName,
    }));
    setShowDeanSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.userId ||
      !formData.name ||
      !formData.department ||
      !formData.role ||
      !formData.email ||
      !formData.mobile ||
      !formData.designation ||
      !formData.password
    ) {
      console.warn("Validation failed: Missing required fields", formData);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Higher Dean required for Associate Dean role
    if (formData.role === "associate_dean" && !formData.higherDean) {
      toast({
        title: "Validation Error",
        description: "Higher Dean is required for Associate Dean role",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.mobile)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = tokenManager.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post("/api/admin/create-user", formData, {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });

      const data = response.data;

      // Check if response is successful (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        setSuccessMessage(
          `Faculty ${formData.name} has been added successfully!`
        );
        setShowSuccessDialog(true);
        resetForm();
        toast({
          title: "Success",
          description: data.message || "Faculty added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add faculty",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding faculty:", error);
      toast({
        title: "Error",
        description: "An error occurred while adding faculty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    setFormData({
      userId: "",
      name: "",
      department: "",
      role: "",
      email: "",
      mobile: "",
      designation: "",
      higherDean: "",
      higherDeanName: "",
      date_added: formattedDate,
      year: calculateAcademicYear(formattedDate),
      status: "active",
      password: "",
    });
  };

  const filteredDeanSuggestions = deanSuggestions.filter(
    (dean) =>
      dean.name.toLowerCase().includes((formData.higherDeanName ?? "").toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Full-Width Form Panel */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {/* Helper Text */}
          <p className="text-sm text-gray-600">Fields marked with <span className="text-red-500">*</span> are required</p>

          {/* Basic Details Section */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Basic Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User ID */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-semibold text-gray-800">
                  User ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={formData.userId}
                  onChange={(e) => handleInputChange(e, "userId")}
                  className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  required
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-800">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e, "name")}
                  className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-800">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange(e, "email")}
                  className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  required
                />
              </div>

              {/* Mobile */}
              <div className="space-y-2">
                <Label htmlFor="mob" className="text-sm font-semibold text-gray-800">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mob"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange(e, "mobile")}
                  maxLength={10}
                  className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional Details Section */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Professional Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="dept" className="text-sm font-semibold text-gray-800">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select
                  key={`dept-${formData.department || 'empty'}`}
                  value={formData.department || undefined}
                  onValueChange={(value) => handleSelectChange("department", value)}
                  required
                >
                  <SelectTrigger className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold text-gray-800">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  key={`role-${formData.role || 'empty'}`}
                  value={formData.role || undefined}
                  onValueChange={(value) => handleSelectChange("role", value)}
                  required
                >
                  <SelectTrigger className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Designation */}
              <div className="space-y-2">
                <Label htmlFor="designation" className="text-sm font-semibold text-gray-800">
                  Designation <span className="text-red-500">*</span>
                </Label>
                <Select
                  key={`designation-${formData.designation || 'empty'}`}
                  value={formData.designation || undefined}
                  onValueChange={(value) => handleSelectChange("designation", value)}
                  required
                >
                  <SelectTrigger className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((desg) => (
                      <SelectItem key={desg.value} value={desg.value}>
                        {desg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Academic Details Section */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Academic Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date of Joining */}
              <div className="space-y-2">
                <Label htmlFor="date_added" className="text-sm font-semibold text-gray-800">
                  Date of Joining <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_added"
                  type="date"
                  value={formData.date_added}
                  onChange={handleDateChange}
                  className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  required
                />
              </div>

              {/* Academic Year (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-semibold text-gray-800">
                  Academic Year
                </Label>
                <Input
                  id="year"
                  value={formData.year}
                  disabled
                  className="h-11 bg-gray-50 border-gray-200 text-gray-600 text-base"
                />
              </div>

              {/* Higher Dean - Only shown for Associate Dean role */}
              {formData.role === "associate_dean" && (
                <div className="space-y-2 relative md:col-span-2">
                  <Label htmlFor="higherDean" className="text-sm font-semibold text-gray-800">
                    Higher Dean <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="higherDean"
                    placeholder="Start typing dean name..."
                    value={formData.higherDeanName}
                    onChange={(e) => handleInputChange(e, "higherDeanName")}
                    onFocus={() => {
                      setShowDeanSuggestions(true);
                      fetchDeanSuggestions();
                    }}
                    className="h-11 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                    required
                  />
                  {showDeanSuggestions &&
                    filteredDeanSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredDeanSuggestions.map((dean) => (
                          <button
                            key={dean._id}
                            type="button"
                            onClick={() => handleDeanSelect(dean.name, dean._id)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-0"
                          >
                            <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {dean.name}
                              </p>
                              <p className="text-xs text-gray-500">{dean.dept}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Fixed at Bottom */}
          <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={loading}
              className="px-6 h-11 border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-10 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm text-base"
            >
              {loading ? (
                <>
                  <Loader variant="inline" className="mr-2 h-5 w-5" />
                  Adding...
                </>
              ) : (
                'Add Faculty'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Success!
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Loader from "@/components/loader";
import { Users, Plus, Check, Trash2, RefreshCw, Building } from "lucide-react";
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
import { tokenManager } from "@/lib/api-client";
import axios from "axios";
import { Badge } from "@/components/ui/badge";

interface Faculty {
  _id: string;
  userId: string;
  name: string;
  department: string;
  designation: string;
  role: string;
  dept?: string;
}

interface Dean {
  _id: string;
  userId: string;
  name: string;
  dept?: string;
}

interface DepartmentDeans {
  [department: string]: Dean[];
}

export default function AssignDeanToDepartmentPage() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [deanIds, setDeanIds] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [suggestions, setSuggestions] = useState<Faculty[]>([]);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);
  const [departmentDeans, setDepartmentDeans] = useState<DepartmentDeans>({});
  const [isLoading, setIsLoading] = useState(false);

  const departments = [
    { label: 'Computer Engineering', value: 'computer' },
    { label: 'Information Technology', value: 'it' },
    { label: 'Mechanical Engineering', value: 'mechanical' },
    { label: 'Civil Engineering', value: 'civil' },
    { label: 'Electronics and Telecommunication Engineering', value: 'entc' },
    { label: 'Computer Engineering (Regional)', value: 'computer_regional' },
    { label: 'Artificial Intelligence and Machine Learning', value: 'aiml' },
    { label: 'Applied Sciences and Humanities', value: 'ash' },
    { label: 'PCCOE - Institute Level', value: 'pccoe' },
];

  useEffect(() => {
    fetchFacultyData();
    fetchAllInteractionDeans();
  }, []);

  const fetchFacultyData = async () => {
    try {
      const token = tokenManager.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/faculties`,
        {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        }
      );

      if (response.status < 200 || response.status >= 300)
        throw new Error("Failed to fetch faculty data");
      const data = response.data;

      const facultyList = data || [];
      const deanFaculty = facultyList.filter(
        (faculty: Faculty) => faculty.role === "dean"
      );
      setAllFaculty(deanFaculty);
      console.log("Dean faculty loaded:", deanFaculty.length);
    } catch (err) {
      const errorMessage = `Error loading faculty data: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch faculty data",
        variant: "destructive",
      });
    }
  };

  const fetchAllInteractionDeans = async () => {
    setIsLoading(true);
    try {
      const token = tokenManager.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/interaction-deans`,
        {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        setDepartmentDeans(response.data.data || {});
      } else {
        throw new Error("Failed to fetch interaction deans");
      }
    } catch (err) {
      const errorMessage = `Error loading interaction deans: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch interaction deans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMore = () => {
    setDeanIds([...deanIds, ""]);
    setSuggestions([]);
  };

  const handleDeanIdChange = (index: number, value: string) => {
    const newDeanIds = [...deanIds];
    newDeanIds[index] = value;
    setDeanIds(newDeanIds);
    setActiveInputIndex(index);

    console.log("Typing:", value, "Available faculty:", allFaculty.length);

    if (value.trim()) {
      // Filter based on typed text
      const filtered = allFaculty
        .filter(
          (faculty) =>
            (faculty.userId.toLowerCase().includes(value.toLowerCase()) ||
              faculty.name.toLowerCase().includes(value.toLowerCase())) &&
            !deanIds.includes(faculty.userId)
        )
        .slice(0, 10);
      console.log("Filtered suggestions:", filtered.length);
      setSuggestions(filtered);
    } else {
      // Show all available deans when input is empty
      const availableDeans = allFaculty
        .filter((faculty) => !deanIds.includes(faculty.userId))
        .slice(0, 10);
      setSuggestions(availableDeans);
    }
  };

  const handleSuggestionClick = (index: number, faculty: Faculty) => {
    const newDeanIds = [...deanIds];
    newDeanIds[index] = faculty.userId;
    setDeanIds(newDeanIds);
    setSuggestions([]);
    setActiveInputIndex(null);
  };

  const handleRemoveDean = (index: number) => {
    const newDeanIds = deanIds.filter((_, i) => i !== index);
    setDeanIds(newDeanIds);
    setSuggestions([]);
  };

  const handleInputFocus = (index: number, currentValue: string) => {
    setActiveInputIndex(index);
    if (!currentValue.trim()) {
      // Show all available deans when focused with empty input
      const availableDeans = allFaculty
        .filter((faculty) => !deanIds.includes(faculty.userId))
        .slice(0, 10);
      setSuggestions(availableDeans);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDepartment) {
      setError("Please select a department");
      toast({
        title: "Error",
        description: "Please select a department",
        variant: "destructive",
      });
      return;
    }

    if (deanIds.some((id) => !id.trim())) {
      setError("Please provide valid faculty IDs for all entries");
      toast({
        title: "Error",
        description: "Please provide valid faculty IDs for all entries",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = tokenManager.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/interaction-deans/${selectedDepartment}`,
        { dean_ids: deanIds },
        {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        }
      );

      const data = response.data;

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          data.error || "Failed to assign interaction deans to department"
        );
      }

      setSuccessMessage("Interaction deans assigned successfully!");
      setShowSuccessDialog(true);

      setSelectedDepartment("");
      setDeanIds([""]);
      fetchAllInteractionDeans();

      toast({
        title: "Success",
        description: "Interaction deans assigned successfully!",
      });
    } catch (error) {
      console.error("Error assigning interaction deans:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFacultyName = (id: string) => {
    const faculty = allFaculty.find((f) => f.userId === id);
    return faculty ? faculty.name : id;
  };

  return (
    <div className="space-y-8">
      {/* Form to assign interaction deans */}
      <div className="bg-card rounded-xl shadow-sm border">
        <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Building className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-foreground">
              Assign Interaction Deans to Department
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6 max-w-2xl">
            {/* Department Selection */}
            <div className="space-y-2">
              <Label htmlFor="department">Select Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={(value) => {
                  setSelectedDepartment(value);
                  setSuggestions([]);
                }}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dean Faculty IDs */}
            <div className="space-y-4">
              <Label>Interaction Deans</Label>
              {deanIds.map((id, index) => (
                <div key={index} className="relative">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={id}
                      onChange={(e) =>
                        handleDeanIdChange(index, e.target.value)
                      }
                      onFocus={() => handleInputFocus(index, id)}
                      onBlur={() => setTimeout(() => setActiveInputIndex(null), 200)}
                      placeholder="Enter faculty ID or name"
                      required
                      className="flex-1"
                    />
                    {deanIds.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveDean(index)}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Remove dean"
                      >
                        <Trash2 size={20} />
                      </Button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && activeInputIndex === index && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {suggestions.map((faculty) => (
                        <div
                          key={faculty._id}
                          onClick={() => handleSuggestionClick(index, faculty)}
                          className="px-4 py-2 hover:bg-accent cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium">{faculty.userId}</span>
                            <span className="text-muted-foreground ml-2">
                              ({faculty.name})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              {faculty.department}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Dean
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={handleAddMore}
                variant="outline"
                className="gap-2"
              >
                <Plus size={18} />
                Add Another Dean
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader variant="inline" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Assign Interaction Deans
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Display Department Interaction Deans */}
      <div className="bg-card rounded-xl shadow-sm border">
        <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-semibold text-foreground">
                Current Interaction Deans
              </h2>
            </div>
            <Button
              onClick={fetchAllInteractionDeans}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map((department) => {
                const deansData = departmentDeans[department.value];
                return (
                  <div
                    key={department.value}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-muted px-4 py-3 border-b">
                      <h3 className="text-md font-medium flex items-center gap-2">
                        <Building
                          size={16}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        {department.label}
                      </h3>
                    </div>
                    <div className="p-4">
                      {!deansData || deansData.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">
                          No interaction deans assigned
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {deansData.map((dean, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {dean.name || getFacultyName(dean.userId)}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    ({dean.userId})
                                  </span>
                                </div>
                                {dean.dept && (
                                  <span className="text-xs text-muted-foreground mt-1">
                                    From: {dean.dept}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4">
              <Check className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <DialogTitle className="text-center">Success</DialogTitle>
            <DialogDescription className="text-center">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center sm:justify-center">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

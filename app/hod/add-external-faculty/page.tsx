"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Briefcase, BookOpen, Building2, MapPin, Trash2, Plus, Users } from "lucide-react";
import Loader from "@/components/loader";
import { StatCard } from "@/components/stat-card";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/AuthProvider";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExternalFaculty {
  _id: string;
  full_name: string;
  mail: string;
  mob: string;
  desg: string;
  specialization: string;
  organization: string;
  address: string;
}

const EMPTY_FORM = {
  full_name: "",
  mail: "",
  mob: "",
  desg: "",
  specialization: "",
  organization: "",
  address: "",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AddExternalFacultyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [externalList, setExternalList] = useState<ExternalFaculty[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ExternalFaculty | null>(null);

  const dept = user?.department;

  const fetchExternals = useCallback(async () => {
    if (!dept) return;
    setFetching(true);
    try {
      const response = await axios.get(`${API_BASE}/api/hod/${dept}/get-externals`);
      if (response.data.success) {
        setExternalList(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching external faculty:", error);
      toast({ title: "Error", description: "Failed to load external faculty list.", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [dept, toast]);

  useEffect(() => {
    fetchExternals();
  }, [fetchExternals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept) return;
    if (!formData.full_name || !formData.mail) {
      toast({ title: "Validation Error", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/hod/${dept}/create-external`, formData);
      if (response.data.success) {
        toast({ title: "External faculty added", description: `${formData.full_name} has been registered.` });
        setFormData({ ...EMPTY_FORM });
        fetchExternals();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add external faculty.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !dept) return;
    try {
      // Note: Assuming endpoint DELETE /:dept/external/:id exists or similar
      const response = await axios.delete(`${API_BASE}/api/hod/${dept}/external/${deleteTarget._id}`);
      if (response.data.success) {
        setExternalList((prev) => prev.filter((f) => f._id !== deleteTarget._id));
        toast({ title: "Removed", description: `${deleteTarget.full_name} has been removed.` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove external faculty.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const fields: { name: keyof typeof EMPTY_FORM; label: string; icon: React.ReactNode; placeholder: string; type?: string }[] = [
    { name: "full_name", label: "Full Name", icon: <User size={15} />, placeholder: "Dr. Jane Smith" },
    { name: "mail", label: "Email", icon: <Mail size={15} />, placeholder: "jane@example.com", type: "email" },
    { name: "mob", label: "Mobile", icon: <Phone size={15} />, placeholder: "+91 9876543210" },
    { name: "desg", label: "Designation", icon: <Briefcase size={15} />, placeholder: "Professor" },
    { name: "specialization", label: "Specialization", icon: <BookOpen size={15} />, placeholder: "Machine Learning" },
    { name: "organization", label: "Organization", icon: <Building2 size={15} />, placeholder: "IIT Bombay" },
    { name: "address", label: "Address", icon: <MapPin size={15} />, placeholder: "Mumbai, Maharashtra" },
  ];

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total External Evaluators"
            value={externalList.length}
            icon={Users}
            color="primary"
          />
        </motion.div>

        {/* Form */}
        <motion.div variants={itemVariants}>
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="h-5 w-1 bg-primary rounded-full" />
                Register External Evaluator
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {fields.map((f) => (
                    <div key={f.name} className="space-y-1.5">
                      <Label htmlFor={f.name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">{f.icon}</span>
                        <Input
                          id={f.name}
                          name={f.name}
                          type={f.type ?? "text"}
                          placeholder={f.placeholder}
                          value={formData[f.name]}
                          onChange={handleChange}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="submit" className="mt-5" disabled={loading}>
                  {loading ? <Loader variant="inline" className="mr-2 border-white" /> : null}
                  {loading ? "Adding…" : "Add External Faculty"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* List */}
        <motion.div variants={itemVariants}>
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="h-5 w-1 bg-primary rounded-full" />
                Registered External Evaluators
                <span className="ml-auto text-xs font-medium text-muted-foreground opacity-70">
                  {externalList.length} Total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead className="text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetching ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Loader variant="page" message="Loading external evaluators..." />
                      </TableCell>
                    </TableRow>
                  ) : externalList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                        No external evaluators registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    externalList.map((ef) => (
                      <TableRow key={ef._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <p className="font-medium text-foreground">{ef.full_name}</p>
                          <p className="text-xs text-muted-foreground">{ef.mail}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ef.organization || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ef.specialization || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(ef)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove external faculty?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.full_name}</strong> will be removed from the external evaluators list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

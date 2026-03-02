"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Search, Users, CheckSquare, Clock, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/AuthProvider";

interface AssignedFaculty {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  status: string;
  externalMarks: number | null;
}

const statusColors: Record<string, string> = {
  interaction_pending: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function CollegeExternalDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [faculty, setFaculty] = useState<AssignedFaculty[]>([]);
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");

  useEffect(() => {
    // TODO: GET /api/college-external/assigned
    // Filter designation === "HOD" || "Dean" && status === "Interaction_pending" || "done"
  }, [user]);

  const filtered = faculty.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDesig = designationFilter === "all" || f.designation === designationFilter;
    return matchSearch && matchDesig;
  });

  const evaluated = faculty.filter((f) => f.externalMarks !== null).length;
  const pending = faculty.length - evaluated;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Assigned Faculty" value={faculty.length} icon={Users} color="primary" />
        <StatCard title="Evaluated" value={evaluated} icon={CheckSquare} color="accent" />
        <StatCard title="Pending" value={pending} icon={Clock} color="secondary" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={designationFilter} onValueChange={setDesignationFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="HOD">HOD</SelectItem>
            <SelectItem value="Dean">Dean</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Authority Faculty for Evaluation ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Your Marks</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No faculty assigned to you
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{f.employeeId}</TableCell>
                        <TableCell>{f.department}</TableCell>
                        <TableCell>{f.designation}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[f.status] ?? "bg-gray-100 text-gray-800"}>
                            {f.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {f.externalMarks !== null ? (
                            <span className="font-mono font-semibold text-green-600">{f.externalMarks}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/college-external/evaluate/${f.id}?department=${f.department}`)}
                          >
                            {f.externalMarks !== null ? "Re-evaluate" : "Evaluate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

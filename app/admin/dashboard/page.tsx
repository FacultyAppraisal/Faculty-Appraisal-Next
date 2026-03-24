"use client";
import Dashboard from "@/components/dashboard";
import { User, BookOpen, FileText, Building2, GraduationCap, CheckSquare } from "lucide-react";
import { useAuth } from "@/app/AuthProvider";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  return (
    <Dashboard
      quickLinks={[
        {
          href: "/admin/profile",
          icon: <User className="w-6 h-6 text-indigo-600" />,
          label: "Profile",
          description: "View and update your profile",
        },
        {
          href: "/admin/faculty",
          icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
          label: "Faculty List",
          description: "Manage all faculty members",
        },
        {
          href: "/admin/add-faculty",
          icon: <FileText className="w-6 h-6 text-indigo-600" />,
          label: "Add Faculty",
          description: "Add a new faculty member",
        },
        {
          href: "/admin/verification-team",
          icon: <CheckSquare className="w-6 h-6 text-indigo-600" />,
          label: "Verification Team",
          description: "Manage verification teams",
        },
        {
          href: "/admin/assign-faculty-to-verification-team",
          icon: <Building2 className="w-6 h-6 text-indigo-600" />,
          label: "Assign Faculty to Team",
          description: "Assign faculty to verification teams",
        },
        {
          href: "/admin/assign-dean-to-department",
          icon: <GraduationCap className="w-6 h-6 text-indigo-600" />,
          label: "Assign Dean",
          description: "Assign dean to department",
        },
      ]}
    />
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { containerVariants, itemVariants } from "@/lib/animations";
import {
  Users,
  FileText,
  CheckSquare,
  Award,
  Building2,
  UserCheck,
  UserPlus,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/app/AuthProvider";

interface HodStats {
  totalFaculty: number;
  submitted: number;
  pendingVerification: number;
  verified: number;
}

const quickLinks = [
  {
    href: "/hod/faculty",
    icon: Users,
    label: "Department Faculty",
    description: "View faculty appraisal forms and status",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/department-review",
    icon: Building2,
    label: "Verification Panel",
    description: "Assign faculty to verification committee members",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/verify",
    icon: CheckSquare,
    label: "HOD Verify",
    description: "Verify submitted faculty appraisals",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/confirm-verify",
    icon: UserCheck,
    label: "Confirm Verify",
    description: "Confirm and finalise HOD verification",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/final-marks",
    icon: Award,
    label: "Final Marks",
    description: "Review consolidated final marks",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/add-external-faculty",
    icon: UserPlus,
    label: "Add External Faculty",
    description: "Register external evaluators for your department",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
  {
    href: "/hod/assign-faculty-external",
    icon: BookOpen,
    label: "Assign to External",
    description: "Assign faculty members to external evaluators",
    color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
  },
];

export default function HodDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HodStats>({
    totalFaculty: 0,
    submitted: 0,
    pendingVerification: 0,
    verified: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // TODO: replace with real HOD stats endpoint once API is ready
        // const res = await fetch(`/api/hod/stats`, { headers: { Authorization: `Bearer ${token}` } });
        // const data = await res.json();
        // setStats(data);
      } catch (err) {
        console.error("Failed to fetch HOD stats:", err);
        setError("Failed to load dashboard statistics");
      } finally {
        // Use placeholder data until API is wired up
        setStats({
          totalFaculty: 0,
          submitted: 0,
          pendingVerification: 0,
          verified: 0,
        });
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Faculty"
            value={isLoading ? "..." : stats.totalFaculty}
            icon={Users}
            color="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Forms Submitted"
            value={isLoading ? "..." : stats.submitted}
            icon={FileText}
            color="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Pending Verification"
            value={isLoading ? "..." : stats.pendingVerification}
            icon={ClipboardList}
            color="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Verified"
            value={isLoading ? "..." : stats.verified}
            icon={Award}
            color="primary"
          />
        </motion.div>
      </motion.div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-5">Quick Access</h2>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <motion.div key={link.href} variants={itemVariants}>
                <Link
                  href={link.href}
                  className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${link.color} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {link.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {link.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Department Info */}
      {user?.department && (
        <motion.div
          className="mt-10 p-5 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">
            Your Department
          </p>
          <p className="text-lg font-bold text-foreground capitalize">
            {(() => {
              const deptMaps: Record<string, string> = {
                'computer': 'Computer Engineering',
                'it': 'Information Technology',
                'mechanical': 'Mechanical Engineering',
                'civil': 'Civil Engineering',
                'entc': 'Electronics and Telecommunication Engineering',
                'computer_regional': 'Computer Engineering (Regional)',
                'aiml': 'Artificial Intelligence and Machine Learning',
                'ash': 'Applied Sciences and Humanities',
                'pccoe': 'PCCOE - Institute Level'
              };
              const d = user.department.toLowerCase();
              return deptMaps[d] || user.department;
            })()}
          </p>
        </motion.div>
      )}
    </>
  );
}

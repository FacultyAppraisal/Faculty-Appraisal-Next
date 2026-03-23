"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  UserPlus,
  UserCheck,
  Building,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileText,
  Building2,
  GraduationCap,
  Award,
  CheckSquare,
  ClipboardList,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAuth } from "@/app/AuthProvider"
import type { User } from "@/lib/types"

interface SidebarProps {
  userRole: User["role"]
  isOpen?: boolean
  isExpanded?: boolean
  onClose?: () => void
  onOpen?: () => void
  onToggle?: () => void
}

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

interface SidebarSection {
  key: string
  label?: string
  icon?: LucideIcon
  items: NavItem[]
  collapsible?: boolean
}

interface RoleConfig {
  title: string
  sections: SidebarSection[]
}

const ROLE_CONFIG: Record<User["role"], RoleConfig> = {
  admin: {
    title: "Admin Panel",
    sections: [
      {
        key: "admin-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" }],
      },
      {
        key: "manage-faculty",
        label: "Manage Faculty",
        icon: Users,
        collapsible: true,
        items: [
          { icon: UserPlus, label: "Add Faculty", href: "/admin/add-faculty" },
          { icon: Users, label: "Faculty List", href: "/admin/view-faculty" },
        ],
      },
      {
        key: "verification-team",
        items: [
          { icon: UserCheck, label: "Verification Team", href: "/admin/verification-team" },

        ],
      },
      {
        key: "admin-other",
        items: [
          { icon: Building, label: "Assign Dean To Department", href: "/admin/assign-dean-to-department" },
        ],
      },
    ],
  },
  associate_dean: {
    title: "Associate Dean",
    sections: [
      {
        key: "associate-dean-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/associate-dean/dashboard" }],
      },
      {
        key: "associate-dean-appraisal",
        label: "Appraisal Form",
        icon: FileText,
        collapsible: true,
        items: [
          { icon: BookOpen, label: "Part A: Academic Involvement", href: "/associate-dean/appraisal?tab=A" },
          { icon: FileText, label: "Part B: Research & Development", href: "/associate-dean/appraisal?tab=B" },
          { icon: Building2, label: "Part C: Self Development", href: "/associate-dean/appraisal?tab=C" },
          { icon: GraduationCap, label: "Part D: Portfolio", href: "/associate-dean/appraisal?tab=D" },
          { icon: Award, label: "Part E: Extraordinary Contribution", href: "/associate-dean/appraisal?tab=E" },
          { icon: CheckSquare, label: "Review & Submit", href: "/associate-dean/appraisal?tab=F" },
        ],
      },
      {
        key: "associate-dean-review",
        items: [{ icon: ClipboardList, label: "Review Submissions", href: "/associate-dean/review" }],
      },
    ],
  },
  director: {
    title: "Director",
    sections: [
      {
        key: "director-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/director/dashboard" }],
      },
      {
        key: "director-privileges",
        label: "Director Privileges",
        icon: Award,
        collapsible: true,
        items: [
          { icon: Building, label: "HOD Appraisals", href: "/director/hod-forms" },
          { icon: Users, label: "Dean Appraisals", href: "/director/dean-forms" },
          { icon: FileText, label: "Faculty Appraisals", href: "/director/faculty-forms" },
          { icon: ClipboardList, label: "Sent Appraisals", href: "/director/sent-appraisals" },
          { icon: ClipboardList, label: "Final Marks", href: "/director/final-marks" },
        ],
      },
      {
        key: "director-externals",
        label: "External Reviewers",
        icon: UserPlus,
        collapsible: true,
        items: [
          { icon: UserPlus, label: "Add External", href: "/director/add-external" },
          { icon: UserCheck, label: "Assign External", href: "/director/assign-external" },
        ],
      },
      {
        key: "director-verify",
        items: [{ icon: CheckSquare, label: "Director Verify", href: "/director/director-verify" }],
      },
    ],
  },
  external: {
    title: "External Reviewer",
    sections: [
      {
        key: "external-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/external/dashboard" }],
      },
      {
        key: "external-interaction",
        items: [{ icon: ClipboardList, label: "Give Interaction Marks", href: "/external/interaction-marks" }],
      },
    ],
  },
  college_external: {
    title: "College External",
    sections: [
      {
        key: "college-external-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/college-external/dashboard" }],
      },
      {
        key: "college-external-evaluate",
        items: [{ icon: ClipboardList, label: "Evaluate Authorities", href: "/college-external/dashboard" }],
      },
    ],
  },
  verification_team: {
    title: "Verification Team",
    sections: [
      {
        key: "verification-team-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/verification-team/dashboard" }],
      },
      {
        key: "verification-team-form",
        items: [{ icon: CheckSquare, label: "Verification Form", href: "/verification-team/dashboard" }],
      },
    ],
  },
  hod: {
    title: "HOD Panel",
    sections: [
      {
        key: "hod-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/hod/dashboard" }],
      },
      {
        key: "hod-appraisal",
        label: "Appraisal Form",
        icon: FileText,
        collapsible: true,
        items: [
          { icon: BookOpen, label: "Part A: Academic Involvement", href: "/hod/appraisal?tab=A" },
          { icon: FileText, label: "Part B: Research & Development", href: "/hod/appraisal?tab=B" },
          { icon: Building2, label: "Part C: Self Development", href: "/hod/appraisal?tab=C" },
          { icon: GraduationCap, label: "Part D: Portfolio", href: "/hod/appraisal?tab=D" },
          { icon: Award, label: "Part E: Extraordinary Contribution", href: "/hod/appraisal?tab=E" },
          { icon: CheckSquare, label: "Review & Submit", href: "/hod/appraisal?tab=F" },
        ],
      },
      {
        key: "hod-privileges",
        label: "HOD Privileges",
        icon: Award,
        collapsible: true,
        items: [
          { icon: Users, label: "Department Faculty Forms", href: "/hod/faculty" },
        ],
      },
      {
        key: "hod-interactions",
        label: "Interactions",
        icon: UserPlus,
        collapsible: true,
        items: [
          { icon: UserPlus, label: "Add External Faculty", href: "/hod/add-external-faculty" },
          { icon: UserCheck, label: "Assign External Faculty", href: "/hod/assign-faculty-external" },
        ],
      },
      {
        key: "hod-final-review",
        items: [{ icon: CheckSquare, label: "Final Review", href: "/hod/final-review" }],
      },
    ],
  },
  dean: {
    title: "Dean Panel",
    sections: [
      {
        key: "dean-dashboard",
        items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/dean/dashboard" }],
      },
      {
        key: "dean-appraisal",
        label: "Appraisal Form",
        icon: FileText,
        collapsible: true,
        items: [
          { icon: BookOpen, label: "Part A: Academic Involvement", href: "/dean/appraisal?tab=A" },
          { icon: FileText, label: "Part B: Research & Development", href: "/dean/appraisal?tab=B" },
          { icon: Building2, label: "Part C: Self Development", href: "/dean/appraisal?tab=C" },
          { icon: GraduationCap, label: "Part D: Portfolio", href: "/dean/appraisal?tab=D" },
          { icon: Award, label: "Part E: Extraordinary Contribution", href: "/dean/appraisal?tab=E" },
          { icon: CheckSquare, label: "Review & Submit", href: "/dean/appraisal?tab=F" },
        ],
      },
      {
        key: "dean-privileges",
        label: "Dean Privileges",
        icon: Award,
        collapsible: true,
        items: [
          { icon: Users, label: "Associate Deans", href: "/dean/associate-deans" },
        ],
      },
      {
        key: "dean-interactions",
        label: "Interactions",
        icon: UserPlus,
        collapsible: true,
        items: [
          { icon: FileText, label: "Interaction Marks", href: "/dean/interaction-marks" },
        ],
      },
    ],
  },
  faculty: {
    title: "Faculty Appraisal",
    sections: [
      {
        key: "faculty-dashboard",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", href: "/faculty/dashboard" },
        ],
      },
      {
        key: "faculty-appraisal-form",
        label: "Appraisal Form",
        icon: FileText,
        collapsible: true,
        items: [
          { icon: BookOpen, label: "Part A: Academic Involvement", href: "/faculty/appraisal?tab=A" },
          { icon: FileText, label: "Part B: Research & Development", href: "/faculty/appraisal?tab=B" },
          { icon: Building2, label: "Part C: Self Development", href: "/faculty/appraisal?tab=C" },
          { icon: GraduationCap, label: "Part D: Portfolio", href: "/faculty/appraisal?tab=D" },
          { icon: Award, label: "Part E: Extraordinary Contribution", href: "/faculty/appraisal?tab=E" },
          { icon: CheckSquare, label: "Review & Submit", href: "/faculty/appraisal?tab=F" },
        ],
      },
    ],
  },
}


export function Sidebar({
  userRole,
  isOpen,
  isExpanded,
  onClose,
  onOpen,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const { logout, isLoading, user } = useAuth()

  const [internalOpen, setInternalOpen] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const open = isOpen ?? internalOpen
  const expanded = isExpanded ?? internalExpanded

  const closeSidebar = onClose ?? (() => setInternalOpen(false))
  const openSidebar = onOpen ?? (() => setInternalOpen(true))
  const toggleExpanded = onToggle ?? (() => setInternalExpanded((prev) => !prev))

  const config = useMemo<RoleConfig>(() => {
    const baseConfig = ROLE_CONFIG[userRole] ?? ROLE_CONFIG.faculty
    if (user?.isInVerificationPanel) {
      // Inject paper verification section if user is in verification panel
      return {
        ...baseConfig,
        sections: [
          ...baseConfig.sections,
          {
            key: "paper-verification",
            label: "Paper Verification",
            icon: CheckSquare,
            collapsible: true,
            items: [
              { icon: ClipboardList, label: "Verify Submissions", href: "/verification-team/dashboard" },
            ],
          },
        ],
      }
    }
    return baseConfig
  }, [userRole, user?.isInVerificationPanel])

  const panelTitle = config.title

  const searchParams = useSearchParams()
  const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev }
      config.sections
        .filter((section) => section.collapsible)
        .forEach((section) => {
          if (section.items.some((item) => {
            const [itemPath] = item.href.split("?")
            return itemPath === pathname
          })) {
            next[section.key] = true
          }
        })
      return next
    })
  }, [pathname, config])

  const isActive = (href: string) => fullPath === href || pathname === href

  interface NavLinkProps {
    item: NavItem
    isDropdownItem?: boolean
  }

  const NavLink = ({ item, isDropdownItem = false }: NavLinkProps) => {
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            closeSidebar()
          }
        }}
        className={`
          flex items-start ${expanded ? "space-x-3" : "justify-center"} p-3 rounded-lg
          transition-all duration-200 ease-in-out
          hover:scale-[1.02] transform relative group
          ${isDropdownItem && expanded
            ? `
                ml-3 border-l-2 border-indigo-500 pl-4
                before:content-[""]
                before:absolute
                before:left-[-0.75rem]
                before:top-1/2
                before:w-3
                before:h-[2px]
                before:bg-indigo-500
              `
            : ""
          }
          ${isActive(item.href) ? "bg-indigo-700 text-white shadow-md" : "text-indigo-100 hover:bg-indigo-700/70"}
        `}
        title={expanded ? "" : item.label}
      >
        <Icon size={20} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
        {expanded && <span className="text-sm font-medium break-words leading-tight">{item.label}</span>}
      </Link>
    )
  }

  const toggleSection = (sectionKey: string) => {
    if (expanded) {
      setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
    } else {
      toggleExpanded()
      setOpenSections((prev) => ({ ...prev, [sectionKey]: true }))
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={openSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-indigo-700 text-white shadow-md"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 h-screen bg-indigo-800 text-white z-40
          transform transition-all duration-300 ease-in-out
          ${expanded ? "w-72" : "w-20"} overflow-y-auto flex flex-col
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-indigo-500/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-indigo-400/70
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="border-b border-indigo-700">
          <div className="flex items-center justify-between p-4">
            {expanded && <h2 className="text-xl font-bold tracking-tight">{panelTitle}</h2>}
            <button
              onClick={toggleExpanded}
              className="p-2 hover:bg-indigo-700 rounded-lg transition-all duration-200 hover:scale-110 hidden lg:block"
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <button
              onClick={closeSidebar}
              className="p-2 hover:bg-indigo-700 rounded-full lg:hidden transition-colors duration-200"
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={`${expanded ? "px-4" : "px-2"} py-4 flex-grow overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-indigo-500/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-indigo-400/70`}>
          <nav className="space-y-1">
            {config.sections.map((section) => {
              if (!section.collapsible) {
                return (
                  <Fragment key={section.key}>
                    {section.items.map((item) => (
                      <NavLink key={item.href} item={item} />
                    ))}
                  </Fragment>
                )
              }

              const sectionOpen = !!openSections[section.key]
              const SectionIcon = section.icon ?? Users
              return (
                <div key={section.key} className="mb-2">
                  <button
                    onClick={() => toggleSection(section.key)}
                    className={`w-full flex items-center ${expanded ? "justify-between" : "justify-center"} p-3 rounded-lg text-indigo-100 hover:bg-indigo-700/70 transition-colors duration-200`}
                    title={expanded ? "" : section.label}
                  >
                    <div className={`flex items-center ${expanded ? "space-x-3" : ""}`}>
                      <SectionIcon size={20} strokeWidth={2} />
                      {expanded && <span className="text-sm font-medium">{section.label}</span>}
                    </div>
                    {expanded && (
                      <div className="transition-transform duration-300 ease-in-out">
                        {sectionOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    )}
                  </button>

                  <div
                    className={`
                      overflow-hidden transition-all duration-300 ease-in-out
                      ${sectionOpen && expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
                    `}
                  >
                    <div
                      className={`
                        relative pl-3 mt-1
                        before:content-[""]
                        before:absolute
                        before:left-0
                        before:top-0
                        before:bottom-2
                        before:w-[2px]
                        before:bg-indigo-500
                        space-y-1
                      `}
                    >
                      {section.items.map((item) => (
                        <NavLink key={item.href} item={item} isDropdownItem={true} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        <div className={`${expanded ? "p-4" : "p-2"} border-t border-indigo-700`}>
          <button
            onClick={logout}
            className="w-full px-3 py-2.5 bg-indigo-700 text-white rounded-lg hover:bg-red-600 flex items-center justify-center text-sm font-medium transition-colors duration-200"
            title={expanded ? "" : "Logout"}
            disabled={isLoading}
          >
            <LogOut className={expanded ? "mr-2" : ""} size={18} />
            {expanded && (isLoading ? "Logging out..." : "Logout")}
          </button>
        </div>
      </div>
    </>
  )
}

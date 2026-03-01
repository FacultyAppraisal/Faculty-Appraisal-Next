// Appraisal status constants (synced with backend src/constant/appraisal.ts)
export const APPRAISAL_STATUS = {
  PEDING: "Pending",
  VERIFICATION_PENDING: "Verification Pending",
  PORTFOLIO_MARKING_PENDING: "Portfolio Marks Pending",
  INTERACTION_PENDING: "Interaction Pending",
  MARKS_VERIFICATION_PENDING: "Marks Verification Pending",
  COMPLETED: "Completed",
  SENT_TO_DIRECTOR: "Sent to Director",
} as const;

export type AppraisalStatus = typeof APPRAISAL_STATUS[keyof typeof APPRAISAL_STATUS];

// Department options based on backend constants
export const DEPARTMENTS = [
  { label: 'Computer Engineering', value: 'computer' },
  { label: 'Information Technology', value: 'it' },
  { label: 'Mechanical Engineering', value: 'mechanical' },
  { label: 'Civil Engineering', value: 'civil' },
  { label: 'Electronics and Telecommunication', value: 'entc' },
  { label: 'Computer Engineering (Regional)', value: 'computer_regional' },
  { label: 'AI and Machine Learning', value: 'aiml' },
  { label: 'Applied Sciences and Humanities', value: 'ash' },
] as const;

// Role options based on backend constants
export const ROLES = [
  { label: 'Associate Dean', value: 'associate_dean' },
  { label: 'Director', value: 'director' },
  { label: 'HOD', value: 'hod' },
  { label: 'Dean', value: 'dean' },
  { label: 'Admin', value: 'admin' },
  { label: 'Faculty', value: 'faculty' },
] as const;

// Designation options
export const DESIGNATIONS = [
  { label: 'Professor', value: 'Professor' },
  { label: 'Associate Professor', value: 'Associate Professor' },
  { label: 'Assistant Professor', value: 'Assistant Professor' },
] as const;

// Type exports
export type DepartmentValue = typeof DEPARTMENTS[number]["value"];
export type RoleValue = typeof ROLES[number]["value"];
export type DesignationValue = typeof DESIGNATIONS[number]["value"];

// Copyright text
export const COPYRIGHT_TEXT = "© 2025 PCCOE. All rights reserved.";


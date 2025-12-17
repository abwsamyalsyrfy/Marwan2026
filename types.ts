
export interface Employee {
  id: string; // EmpID (Used as Username)
  name: string; // EmpName
  jobTitle: string; // JobTitle
  email: string;
  active: boolean;
  password?: string; // New: User Password
  role: 'Admin' | 'User'; // New: System Role
  permissions: string[]; // New: List of allowed actions e.g. ['view_dashboard', 'log_tasks']
  lastModified?: string; // New: Timestamp of last update
}

export interface Task {
  id: string; // TaskID
  description: string; // Description
  category: string;
  lastModified?: string; // New: Timestamp of last update
}

export interface Assignment {
  id: string; // AssignmentID
  employeeId: string;
  taskId: string;
}

export interface TaskLog {
  id: string; // LogID
  logDate: string; // ISO Date
  employeeId: string;
  taskId: string; // Can be a routine TaskID or a generated ID for extra tasks
  taskType: 'Daily' | 'Extra'; 
  
  // Updated Status to include Arabic values natively for better Excel import support
  status: 'Completed' | 'Pending' | 'NotApplicable' | 'Leave' | 'منفذة' | 'غير منفذة' | 'لا تنطبق' | 'إجازة' | 'عطلة' | string;
  
  description: string; // Snapshot of task description or Leave Reason
  
  // Approval Workflow Fields
  approvalStatus: 'PendingApproval' | 'Approved' | 'Rejected';
  approvedBy?: string; // Admin Name/ID
  approvedAt?: string; // ISO Date
  managerNote?: string; // Reason for rejection or feedback
}

// New Interface for System Audit Logs (Admin Actions)
export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorName: string; // Who performed the action
  actorId: string;
  actionType: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'CLEAR' | 'APPROVE' | 'REJECT'; 
  target: string; // e.g., "Employee", "Task", "Settings"
  details: string; // e.g., "Deleted employee Ahmed"
}

// Helper interface for the dashboard stats
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  notApplicableTasks: number;
  completionRate: string;
  topPerformer: string;
  activeEmployees: number;
  activeTasksCount: number;
}

// Permission Constants
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  LOG_TASKS: 'log_tasks',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SYSTEM: 'manage_system'
};

export interface TaskAnalysisStep {
  title: string;
  description: string;
  codeSnippet?: string;
  tool: string;
}

export interface TaskAnalysis {
  summary: string;
  complexityScore: number;
  estimatedTimeSaved: string;
  recommendation: string;
  steps: TaskAnalysisStep[];
}

export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  frequency: string;
  analysis?: TaskAnalysis;
}

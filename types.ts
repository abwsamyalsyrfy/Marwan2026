
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
  
  // Statuses
  status: 'Completed' | 'Pending' | 'NotApplicable' | 'Leave' | 'منفذة' | 'غير منفذة' | 'لا تنطبق' | 'إجازة' | 'عطلة' | string;
  
  description: string; // Snapshot of task description or Leave Reason
  
  // Approval Workflow Fields
  approvalStatus: 'PendingApproval' | 'Approved' | 'Rejected';
  approvedBy?: string; // Admin Name/ID
  approvedAt?: string; // ISO Date
  managerNote?: string; // Reason for rejection or feedback
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorId: string;
  actionType: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'CLEAR' | 'APPROVE' | 'REJECT'; 
  target: string;
  details: string;
}

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

export interface NAAnalysisResult {
  reason: string;
  suggestion: string;
  alternativeTasks: string[];
}

export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  frequency: string;
  analysis?: TaskAnalysis;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

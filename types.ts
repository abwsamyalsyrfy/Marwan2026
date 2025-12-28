
export interface Employee {
  id: string; // EmpID (Used as Username)
  name: string; // EmpName
  jobTitle: string; // JobTitle
  email: string;
  active: boolean;
  password?: string;
  role: 'Admin' | 'User';
  permissions: string[];
  lastModified?: string;
}

export interface Task {
  id: string; // TaskID
  description: string; // Description
  category: string;
  lastModified?: string;
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
  taskId: string; 
  taskType: 'Daily' | 'Extra'; 
  status: 'Completed' | 'Pending' | 'NotApplicable' | 'Leave' | 'منفذة' | 'غير منفذة' | 'لا تنطبق' | 'إجازة' | 'عطلة' | string;
  description: string; 
  approvalStatus: 'PendingApproval' | 'Approved' | 'Rejected' | 'CommitmentPending';
  approvedBy?: string;
  approvedAt?: string;
  managerNote?: string;
}

export interface AnnouncementReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  priority: 'Normal' | 'Urgent' | 'Critical';
  createdBy: string;
  targetType: 'All' | 'Specific';
  targetEmployeeIds?: string[];
  likes?: string[]; // Array of employee IDs who liked
  replies?: AnnouncementReply[];
  archived?: boolean; // New: To hide from main dashboard
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorId: string;
  actionType: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'CLEAR' | 'APPROVE' | 'REJECT' | 'ANNOUNCE'; 
  target: string;
  details: string;
}

export interface TeamInsight {
  id?: string;
  summary: string;
  productivityScore: number;
  bottlenecks: string[];
  suggestedRoutineTasks: {
    description: string;
    reason: string;
  }[];
  generatedAt: string; // Timestamp to avoid redundant API calls
}

export interface TaskAnalysis {
  summary: string;
  steps: {
    title: string;
    description: string;
    tool?: string;
    codeSnippet?: string;
  }[];
}

export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  frequency: string;
  analysis?: TaskAnalysis;
}

export interface DashboardStats {
  total: number;
  completed: number;
  pendingTask: number;
  todayCount: number;
  activeEmpCount: number;
  rate: number;
  chartData: any[];
  recentActivity: any[];
  pendingLogs: TaskLog[];
  pendingApprovalsList: TaskLog[];
}

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  LOG_TASKS: 'log_tasks',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SYSTEM: 'manage_system'
};

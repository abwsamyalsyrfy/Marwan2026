
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaskDashboard from './components/TaskDashboard';
import DailyLogger from './components/DailyLogger';
import AdminPanel from './components/AdminPanel';
import AnalyticsReports from './components/AnalyticsReports';
import LoginScreen from './components/LoginScreen';
import UserSettings from './components/UserSettings';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS, Announcement } from './types';
import { Menu, Loader2, WifiOff, ShieldAlert, ExternalLink } from 'lucide-react';
import { db } from './services/db';

const App: React.FC = () => {
  // --- Database State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemAuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- 1. Load Data on Startup ---
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [empData, taskData, assignData, logData, sysLogData, announceData] = await Promise.all([
          db.employees.list(),
          db.tasks.list(),
          db.assignments.list(),
          db.logs.list(),
          db.systemLogs.list(),
          db.announcements.list()
        ]);
        
        setEmployees(empData);
        setTasks(taskData);
        setAssignments(assignData);
        setLogs(logData);
        setSystemLogs(sysLogData);
        setAnnouncements(announceData);
        setIsOfflineMode(false);
        setIsPermissionError(false);
      } catch (error: any) {
        console.error("Failed to load data:", error?.message || error);
        if (error?.code === 'permission-denied') setIsPermissionError(true);
        setIsOfflineMode(true);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const recordSystemAction = async (actor: Employee | null, actionType: SystemAuditLog['actionType'], target: string, details: string) => {
    try {
      const newLog: SystemAuditLog = {
        id: `SYS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        actorName: actor ? actor.name : 'النظام/زائر',
        actorId: actor ? actor.id : 'UNKNOWN',
        actionType,
        target,
        details
      };
      await db.systemLogs.add(newLog);
      setSystemLogs(prev => [newLog, ...prev]);
    } catch (e) { console.warn(e); }
  };

  const handleLogin = (user: Employee) => {
    if (employees.length === 0 && user.id === 'admin') {
         setCurrentUser(user);
         recordSystemAction(user, 'LOGIN', 'المصادقة', `تم تسجيل الدخول (حساب النظام مؤقت)`);
         setActiveTab('admin'); 
         return;
    }
    const dbUser = employees.find(e => e.id === user.id);
    if (!dbUser || !dbUser.active) { alert("الحساب غير نشط."); return; }
    setCurrentUser(dbUser);
    recordSystemAction(dbUser, 'LOGIN', 'المصادقة', `تم تسجيل الدخول بنجاح`);
    if (dbUser.role === 'Admin') setActiveTab('dashboard');
    else if (dbUser.permissions?.includes(PERMISSIONS.LOG_TASKS)) setActiveTab('daily-log');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    recordSystemAction(currentUser, 'LOGIN', 'المصادقة', `تم تسجيل الخروج`);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  const handleUpdatePassword = async (newPassword: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const updatedUser = { ...currentUser, password: newPassword, lastModified: new Date().toISOString() };
      await db.employees.update(updatedUser);
      setEmployees(prev => prev.map(e => e.id === currentUser.id ? updatedUser : e));
      setCurrentUser(updatedUser);
      recordSystemAction(currentUser, 'UPDATE', 'الملف الشخصي', 'تغيير كلمة المرور');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleSaveLogs = async (newLogs: TaskLog[]) => {
    try {
      const savedLogs = await db.logs.add(newLogs);
      setLogs(prev => [...savedLogs, ...prev]); 
      alert("تم حفظ التقارير بنجاح.");
      if (currentUser?.permissions.includes(PERMISSIONS.VIEW_DASHBOARD)) {
          setActiveTab('dashboard');
      }
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ.");
    }
  };

  const handleImportData = async (data: any[], type: 'employees' | 'tasks' | 'logs' | 'assignments') => {
    await db[type].import(data);
    const updated = await db[type].list();
    if (type === 'employees') setEmployees(updated as Employee[]);
    if (type === 'tasks') setTasks(updated as Task[]);
    if (type === 'logs') setLogs(updated as TaskLog[]);
    if (type === 'assignments') setAssignments(updated as Assignment[]);
    recordSystemAction(currentUser, 'IMPORT', type, `استيراد ${data.length} سجل`);
  };

  const handleAddAnnouncement = async (announce: Announcement) => {
    await db.announcements.add(announce);
    setAnnouncements(prev => [announce, ...prev]);
    recordSystemAction(currentUser, 'ANNOUNCE', 'التعاميم', `نشر تعميم: ${announce.title}`);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await db.announcements.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    recordSystemAction(currentUser, 'DELETE', 'التعاميم', `حذف تعميم رقم: ${id}`);
  };

  const handleClearData = async (type: 'logs' | 'employees' | 'all') => {
    if (type === 'all') { await db.factoryReset(); return; }
    await db[type === 'logs' ? 'logs' : 'employees'].clear();
    if (type === 'logs') setLogs([]);
    else { setEmployees([]); setAssignments([]); }
    recordSystemAction(currentUser, 'CLEAR', type, `تصفير ${type}`);
  };

  const handleAddEmployee = async (emp: Employee) => {
    await db.employees.add(emp);
    setEmployees(prev => [...prev, emp]);
  };
  
  const handleUpdateEmployee = async (emp: Employee) => {
    await db.employees.update(emp);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };
  
  const handleDeleteEmployee = async (id: string) => {
    await db.employees.delete(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleAddTask = async (task: Task) => {
    await db.tasks.add(task);
    setTasks(prev => [...prev, task]);
  };
  
  const handleUpdateTask = async (task: Task) => {
    await db.tasks.update(task);
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };
  
  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateLog = async (log: TaskLog) => {
    await db.logs.update(log);
    setLogs(prev => prev.map(l => l.id === log.id ? log : l));
  };

  const handleApproveLog = async (logId: string) => {
      const log = logs.find(l => l.id === logId);
      if (log) {
          const updated = { ...log, approvalStatus: 'Approved' as const, approvedBy: currentUser?.name, approvedAt: new Date().toISOString() };
          await db.logs.update(updated);
          setLogs(prev => prev.map(l => l.id === logId ? updated : l));
      }
  };

  const handleRejectLog = async (logId: string, reason: string) => {
      const log = logs.find(l => l.id === logId);
      if (log) {
          const updated = { ...log, approvalStatus: 'Rejected' as const, managerNote: reason, approvedBy: currentUser?.name, approvedAt: new Date().toISOString() };
          await db.logs.update(updated);
          setLogs(prev => prev.map(l => l.id === logId ? updated : l));
      }
  };
  
  const handleDeleteLog = async (id: string) => {
    await db.logs.delete(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleAddAssignment = async (eId: string, tId: string) => {
    const n = { id: `ASG-${Date.now()}`, employeeId: eId, taskId: tId };
    await db.assignments.add(n);
    setAssignments(prev => [...prev, n]);
  };
  
  const handleDeleteAssignment = async (id: string) => {
    await db.assignments.delete(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const missingLogsCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const loggedIds = new Set(logs.filter(l => l.logDate.startsWith(todayStr)).map(l => l.employeeId));
    return employees.filter(e => e.active && !loggedIds.has(e.id)).length;
  }, [logs, employees]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  if (isPermissionError && employees.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-right" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl border border-red-100 p-10">
          <h1 className="text-2xl font-black text-red-600 mb-4">يجب ضبط قواعد الحماية في Firebase</h1>
          <p className="mb-6 font-bold">يرجى نسخ الكود التالي لصفحة الـ Rules في Firestore:</p>
          <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl mb-6" dir="ltr">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
          </pre>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">تحديث بعد الضبط</button>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen employees={employees} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-right print:block" dir="rtl">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        missingLogsCount={missingLogsCount} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        logs={logs}
        announcementsCount={announcements.length}
      />
      <div className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center print:hidden">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
        <h1 className="text-lg font-bold text-gray-800">مُيسّر المهام</h1>
        <div className="w-8"></div>
      </div>
      <main className="flex-1 md:mr-64 p-4 md:p-8">
        {(isOfflineMode || isPermissionError) && <div className="mb-4 bg-amber-50 p-3 rounded-lg text-amber-800 text-xs font-bold border border-amber-200">وضع العمل المحلي: قد لا يتم حفظ التغييرات على السحابة حالياً.</div>}
        
        {activeTab === 'dashboard' && <TaskDashboard currentUser={currentUser} logs={logs} employees={employees} announcements={announcements} onRefresh={() => window.location.reload()} onStartLogging={() => setActiveTab('daily-log')} onApproveLog={handleApproveLog} onRejectLog={handleRejectLog} />}
        {activeTab === 'daily-log' && <DailyLogger currentUser={currentUser} tasks={tasks} assignments={assignments} logs={logs} onSaveLogs={handleSaveLogs} onCancel={() => setActiveTab('dashboard')} />}
        {activeTab === 'reports' && <AnalyticsReports employees={employees} logs={logs} tasks={tasks} assignments={assignments} />}
        {activeTab === 'admin' && <AdminPanel employees={employees} tasks={tasks} assignments={assignments} logs={logs} systemLogs={systemLogs} announcements={announcements} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} onImport={handleImportData} onAddAssignment={handleAddAssignment} onDeleteAssignment={handleDeleteAssignment} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onDeleteEmployee={handleDeleteEmployee} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onUpdateLog={handleUpdateLog} onDeleteLog={handleDeleteLog} onClearData={handleClearData} onApproveLog={handleApproveLog} onRejectLog={handleRejectLog} />}
        {activeTab === 'profile' && <UserSettings currentUser={currentUser} onUpdatePassword={handleUpdatePassword} />}
      </main>
    </div>
  );
};

export default App;

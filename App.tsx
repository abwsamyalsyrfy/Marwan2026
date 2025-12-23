
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaskDashboard from './components/TaskDashboard';
import DailyLogger from './components/DailyLogger';
import AdminPanel from './components/AdminPanel';
import AnalyticsReports from './components/AnalyticsReports';
import LoginScreen from './components/LoginScreen';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS } from './types';
import { Menu, Loader2, WifiOff } from 'lucide-react';
import { db } from './services/db';

const App: React.FC = () => {
  // --- Database State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemAuditLog[]>([]);
  
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- 1. Load Data on Startup ---
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [empData, taskData, assignData, logData, sysLogData] = await Promise.all([
          db.employees.list(),
          db.tasks.list(),
          db.assignments.list(),
          db.logs.list(),
          db.systemLogs.list()
        ]);
        
        setEmployees(empData);
        setTasks(taskData);
        setAssignments(assignData);
        setLogs(logData);
        setSystemLogs(sysLogData);
        setIsOfflineMode(false);
      } catch (error: any) {
        console.error("Failed to load data (safely logged):", error?.message || error);
        setIsOfflineMode(true);
        // We don't alert here to avoid circular error crash loops, just set offline mode
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // --- System Logging Helper ---
  const recordSystemAction = async (
    actor: Employee | null, 
    actionType: SystemAuditLog['actionType'], 
    target: string, 
    details: string
  ) => {
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
      
      // Save to DB and State
      await db.systemLogs.add(newLog);
      setSystemLogs(prev => [newLog, ...prev]);
    } catch (e) {
      console.warn("Could not record system log:", e);
    }
  };

  // --- Logic: Calculate KPIs ---
  const missingLogsCount = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    if (day === 4 || day === 5) return 0; // Weekend

    const todayStr = today.toISOString().split('T')[0];
    const loggedEmployeeIds = new Set(
      logs.filter(l => String(l.logDate || '').startsWith(todayStr)).map(l => l.employeeId)
    );
    
    return employees.filter(e => e.active && !loggedEmployeeIds.has(e.id)).length;
  }, [logs, employees]);

  // --- Actions ---
  const handleLogin = (user: Employee) => {
    // Special handling for the "Backdoor Admin" (when database is empty)
    // In LoginScreen, if employees.length === 0, a temporary admin user is created.
    // We must allow this user to log in even if they are not in the 'employees' state array yet.
    if (employees.length === 0 && user.id === 'admin') {
         setCurrentUser(user);
         recordSystemAction(user, 'LOGIN', 'المصادقة', `تم تسجيل الدخول (حساب النظام المؤقت)`);
         setActiveTab('admin'); // Direct to admin panel to create users
         return;
    }

    // Regular Login: Verify user exists in current state
    const dbUser = employees.find(e => e.id === user.id);
    if (!dbUser || !dbUser.active) {
      alert("عذراً، هذا الحساب غير نشط أو تم حذفه.");
      return; 
    }
    
    setCurrentUser(dbUser);
    recordSystemAction(dbUser, 'LOGIN', 'المصادقة', `تم تسجيل الدخول بنجاح`);

    if (dbUser.role === 'Admin') setActiveTab('dashboard');
    else if (dbUser.permissions?.includes(PERMISSIONS.LOG_TASKS)) setActiveTab('daily-log');
    else if (dbUser.permissions?.includes(PERMISSIONS.VIEW_DASHBOARD)) setActiveTab('dashboard');
    else setActiveTab('reports');
  };

  const handleLogout = () => {
    recordSystemAction(currentUser, 'LOGIN', 'المصادقة', `تم تسجيل الخروج`);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  const handleSaveLogs = async (newLogs: TaskLog[]) => {
    await db.logs.add(newLogs);
    setLogs(prev => [...newLogs, ...prev]); 
    alert("تم إرسال التقرير للمراجعة بنجاح وحفظه في النظام.");
    if (currentUser?.permissions.includes(PERMISSIONS.VIEW_DASHBOARD)) {
        setActiveTab('dashboard');
    }
  };

  // --- Import / Clear ---
  const handleImportData = async (data: any[], type: 'employees' | 'tasks' | 'logs' | 'assignments') => {
    if (type === 'employees') {
        const existingIds = new Set(employees.map(e => e.id));
        const newEmployees = data.filter((d: Employee) => !existingIds.has(d.id)).map(e => ({...e, lastModified: new Date().toISOString()}));
        const combined = [...employees, ...newEmployees];
        await db.employees.import(combined);
        setEmployees(combined);
    } else if (type === 'tasks') {
        const existingIds = new Set(tasks.map(t => t.id));
        const newTasks = data.filter((d: Task) => !existingIds.has(d.id)).map(t => ({...t, lastModified: new Date().toISOString()}));
        const combined = [...tasks, ...newTasks];
        await db.tasks.import(combined);
        setTasks(combined);
    } else if (type === 'logs') {
        const newLogs = data.map((l: any) => ({ ...l, id: l.id || `LOG-${Date.now()}-${Math.random()}`, approvalStatus: 'Approved'}));
        const combined = [...newLogs, ...logs];
        await db.logs.import(combined);
        setLogs(combined);
    } else if (type === 'assignments') {
        const newAssigns = data.filter((d: Assignment) => !assignments.some(p => p.employeeId === d.employeeId && p.taskId === d.taskId));
        const combined = [...assignments, ...newAssigns];
        await db.assignments.import(combined);
        setAssignments(combined);
    }
    
    recordSystemAction(currentUser, 'IMPORT', type, `تم استيراد ${data.length} سجل`);
  };

  const handleClearData = async (type: 'logs' | 'employees' | 'all') => {
    if (type === 'logs') {
        await db.logs.clear();
        setLogs([]);
    } else if (type === 'employees') {
        await db.employees.clear();
        await db.assignments.clear();
        setEmployees([]);
        setAssignments([]); 
    } else if (type === 'all') {
        await db.factoryReset(); // This reloads the page
    }
    recordSystemAction(currentUser, 'CLEAR', type, `تم تصفير البيانات: ${type}`);
  };

  // --- CRUD Handlers (Async Wrappers) ---
  const handleAddEmployee = async (emp: Employee) => {
    if (employees.some(e => e.id === emp.id)) { alert("رقم الموظف موجود مسبقاً!"); return; }
    const empWithDate = { ...emp, lastModified: new Date().toISOString() };
    await db.employees.add(empWithDate);
    setEmployees(prev => [...prev, empWithDate]);
    recordSystemAction(currentUser, 'CREATE', 'الموظفين', `إضافة موظف: ${emp.name}`);
  };
  
  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    const empWithDate = { ...updatedEmp, lastModified: new Date().toISOString() };
    await db.employees.update(empWithDate);
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? empWithDate : e));
    recordSystemAction(currentUser, 'UPDATE', 'الموظفين', `تحديث: ${updatedEmp.name}`);
  };
  
  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm("حذف الموظف نهائياً؟")) {
      await db.employees.delete(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      
      // Cleanup assignments locally (DB handling usually backend, but here manual)
      const empAssignments = assignments.filter(a => a.employeeId === id);
      for (const a of empAssignments) await db.assignments.delete(a.id);
      setAssignments(prev => prev.filter(a => a.employeeId !== id));

      recordSystemAction(currentUser, 'DELETE', 'الموظفين', `حذف الموظف ID: ${id}`);
    }
  };

  const handleAddTask = async (task: Task) => {
    if (tasks.some(t => t.id === task.id)) { alert("رقم المهمة موجود مسبقاً!"); return; }
    const taskWithDate = { ...task, lastModified: new Date().toISOString() };
    await db.tasks.add(taskWithDate);
    setTasks(prev => [...prev, taskWithDate]);
    recordSystemAction(currentUser, 'CREATE', 'المهام', `إضافة مهمة: ${task.description}`);
  };
  
  const handleUpdateTask = async (updatedTask: Task) => {
      const taskWithDate = { ...updatedTask, lastModified: new Date().toISOString() };
      await db.tasks.update(taskWithDate);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? taskWithDate : t));
      recordSystemAction(currentUser, 'UPDATE', 'المهام', `تحديث مهمة: ${updatedTask.id}`);
  };
  
  const handleDeleteTask = async (id: string) => {
    if (window.confirm("حذف المهمة؟")) {
      await db.tasks.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // Cleanup assignments
      const taskAssignments = assignments.filter(a => a.taskId === id);
      for (const a of taskAssignments) await db.assignments.delete(a.id);
      setAssignments(prev => prev.filter(a => a.taskId !== id));

      recordSystemAction(currentUser, 'DELETE', 'المهام', `حذف المهمة ID: ${id}`);
    }
  };
  
  const handleUpdateLog = async (updatedLog: TaskLog) => {
      await db.logs.update(updatedLog);
      setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
      recordSystemAction(currentUser, 'UPDATE', 'سجلات المهام', `تعديل سجل: ${updatedLog.id}`);
  };

  const handleApproveLog = async (logId: string) => {
      const targetLog = logs.find(l => l.id === logId);
      if (targetLog) {
          const updated = { ...targetLog, approvalStatus: 'Approved' as const, approvedBy: currentUser?.name, approvedAt: new Date().toISOString() };
          await db.logs.update(updated);
          setLogs(prev => prev.map(l => l.id === logId ? updated : l));
      }
  };

  const handleRejectLog = async (logId: string, reason: string) => {
      const targetLog = logs.find(l => l.id === logId);
      if (targetLog) {
          const updated = { ...targetLog, approvalStatus: 'Rejected' as const, managerNote: reason, approvedBy: currentUser?.name, approvedAt: new Date().toISOString() };
          await db.logs.update(updated);
          setLogs(prev => prev.map(l => l.id === logId ? updated : l));
          recordSystemAction(currentUser, 'REJECT', 'سجلات المهام', `رفض السجل ${logId}: ${reason}`);
      }
  };
  
  const handleDeleteLog = async (id: string) => {
    if (window.confirm("حذف السجل نهائياً؟")) {
        await db.logs.delete(id);
        setLogs(prev => prev.filter(l => l.id !== id));
        recordSystemAction(currentUser, 'DELETE', 'سجلات المهام', `حذف سجل ID: ${id}`);
    }
  };
  
  const handleAddAssignment = async (employeeId: string, taskId: string) => {
    if (assignments.some(a => a.employeeId === employeeId && a.taskId === taskId)) { alert("معين مسبقاً"); return; }
    const newAssign = { id: `ASG-${Date.now()}`, employeeId, taskId };
    await db.assignments.add(newAssign);
    setAssignments(prev => [...prev, newAssign]);
    recordSystemAction(currentUser, 'CREATE', 'التعيينات', `تعيين مهمة لموظف`);
  };
  
  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm("إلغاء التعيين؟")) {
        await db.assignments.delete(id);
        setAssignments(prev => prev.filter(a => a.id !== id));
        recordSystemAction(currentUser, 'DELETE', 'التعيينات', `إلغاء تعيين ID: ${id}`);
    }
  };

  // --- View Protection Logic ---
  const canViewDashboard = currentUser?.permissions?.includes(PERMISSIONS.VIEW_DASHBOARD);
  const canLogTasks = currentUser?.permissions?.includes(PERMISSIONS.LOG_TASKS);
  const canViewReports = currentUser?.permissions?.includes(PERMISSIONS.VIEW_REPORTS);
  const canManageSystem = currentUser?.role === 'Admin' || currentUser?.permissions?.includes(PERMISSIONS.MANAGE_SYSTEM);

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <p className="text-gray-600 font-bold animate-pulse">جاري تحميل النظام وقاعدة البيانات...</p>
          </div>
      );
  }

  // --- Offline Fallback UI ---
  if (isOfflineMode && employees.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <WifiOff className="text-red-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">تعذر الاتصال بقاعدة البيانات</h1>
              <p className="text-gray-600 max-w-md mb-6">
                 النظام غير قادر على الوصول إلى خوادم Firebase. يرجى التحقق من اتصال الإنترنت أو إعدادات جدار الحماية (Firewall).
              </p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                إعادة المحاولة
              </button>
          </div>
      );
  }

  if (!currentUser) {
    return <LoginScreen employees={employees} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-right print:block print:h-auto print:overflow-visible" dir="rtl">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
        missingLogsCount={missingLogsCount}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-30 flex justify-between items-center print:hidden">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">مُيسّر المهام</h1>
        <div className="w-8"></div>
      </div>

      <main className="flex-1 md:mr-64 min-h-screen transition-all print:mr-0 print:w-full print:h-auto print:overflow-visible">
        <div className="max-w-7xl mx-auto p-4 md:p-8 print:p-0 print:max-w-none print:w-full">
          
          {isOfflineMode && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
               <WifiOff className="text-amber-600" size={20} />
               <div>
                  <h4 className="font-bold text-amber-800 text-sm">وضع عدم الاتصال</h4>
                  <p className="text-amber-700 text-xs">تعذر الاتصال بالخادم. التغييرات قد لا تُحفظ.</p>
               </div>
            </div>
          )}
          
          {activeTab === 'dashboard' && canViewDashboard && (
            <TaskDashboard 
              currentUser={currentUser}
              logs={logs}
              employees={employees}
              onRefresh={() => { /* Auto-synced mostly */ }}
              onStartLogging={() => setActiveTab('daily-log')}
              onApproveLog={handleApproveLog}
              onRejectLog={handleRejectLog} 
            />
          )}

          {activeTab === 'daily-log' && canLogTasks && (
            <DailyLogger 
              currentUser={currentUser}
              tasks={tasks}
              assignments={assignments}
              logs={logs} 
              onSaveLogs={handleSaveLogs}
              onCancel={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'reports' && canViewReports && (
             <AnalyticsReports 
               employees={employees}
               logs={logs}
               tasks={tasks}
               assignments={assignments}
             />
          )}

          {activeTab === 'admin' && canManageSystem && (
            <AdminPanel 
              employees={employees}
              tasks={tasks}
              assignments={assignments}
              logs={logs}
              systemLogs={systemLogs}
              onImport={handleImportData}
              onAddAssignment={handleAddAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onUpdateLog={handleUpdateLog}
              onDeleteLog={handleDeleteLog}
              onClearData={handleClearData}
              onApproveLog={handleApproveLog}
              onRejectLog={handleRejectLog}
            />
          )}

          {((activeTab === 'dashboard' && !canViewDashboard) || 
            (activeTab === 'daily-log' && !canLogTasks) || 
            (activeTab === 'reports' && !canViewReports) || 
            (activeTab === 'admin' && !canManageSystem)) && (
            <div className="flex flex-col items-center justify-center h-96">
              <h3 className="text-gray-400 font-bold text-xl mb-4">غير مصرح لك بالوصول لهذه الصفحة</h3>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;

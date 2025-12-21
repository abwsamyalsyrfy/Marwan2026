
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaskDashboard from './components/TaskDashboard';
import DailyLogger from './components/DailyLogger';
import AdminPanel from './components/AdminPanel';
import AnalyticsReports from './components/AnalyticsReports';
import LoginScreen from './components/LoginScreen';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS, Notification } from './types';
import { Menu, Loader2, WifiOff, X, Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { db } from './services/db';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemAuditLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      } catch (error) {
        console.error("Data load failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const notify = (message: string, type: Notification['type'] = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 4000);
  };

  const recordAction = async (actor: Employee | null, type: SystemAuditLog['actionType'], target: string, details: string) => {
    const newLog: SystemAuditLog = {
      id: `SYS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: actor?.name || 'النظام',
      actorId: actor?.id || 'SYSTEM',
      actionType: type,
      target,
      details
    };
    await db.systemLogs.add(newLog);
    setSystemLogs(prev => [newLog, ...prev]);
  };

  const missingLogsCount = useMemo(() => {
    const today = new Date();
    if (today.getDay() === 4 || today.getDay() === 5) return 0;
    const todayStr = today.toISOString().split('T')[0];
    const loggedIds = new Set(logs.filter(l => l.logDate.startsWith(todayStr)).map(l => l.employeeId));
    return employees.filter(e => e.active && !loggedIds.has(e.id)).length;
  }, [logs, employees]);

  const handleLogin = (user: Employee) => {
    const dbUser = employees.find(e => String(e.id) === String(user.id)) || (user.id === 'admin' ? user : null);
    if (!dbUser || !dbUser.active) {
      notify("الحساب غير نشط أو غير موجود", "error");
      return; 
    }
    setCurrentUser(dbUser);
    recordAction(dbUser, 'LOGIN', 'المصادقة', 'دخول ناجح');
    notify(`مرحباً ${dbUser.name}`, "success");
    setActiveTab(dbUser.role === 'Admin' ? 'dashboard' : 'daily-log');
  };

  const handleImport = async (data: any[], type: any) => {
    const nowISO = new Date().toISOString();
    const processed = data.map(item => ({
      ...item,
      id: String(item.id || item.empid || item.taskid),
      lastModified: nowISO,
      logDate: item.logDate ? new Date(item.logDate).toISOString() : item.logDate,
      permissions: typeof item.permissions === 'string' ? item.permissions.split(',') : item.permissions,
      active: item.active === undefined ? true : item.active
    }));

    if (type === 'employees') {
      await db.employees.import(processed);
      setEmployees(processed);
    } else if (type === 'tasks') {
      await db.tasks.import(processed);
      setTasks(processed);
    } else if (type === 'logs') {
      await db.logs.import(processed);
      setLogs(prev => [...processed, ...prev]);
    } else if (type === 'assignments') {
      await db.assignments.import(processed);
      setAssignments(processed);
    }
    notify(`تم استيراد ${data.length} سجل بنجاح`, "success");
    recordAction(currentUser, 'IMPORT', type, `استيراد ${data.length} سجل من ملف Excel`);
  };

  const handleAddAssignment = async (eId: string, tId: string) => {
    const newAsn = { id: `ASN-${Date.now()}`, employeeId: eId, taskId: tId };
    await db.assignments.add(newAsn);
    setAssignments(prev => [...prev, newAsn]);
    notify("تم ربط المهمة", "success");
  };

  const handleDeleteAssignment = async (id: string) => {
    await db.assignments.delete(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
    notify("تم حذف التعيين", "info");
  };

  const handleApproveLog = async (logId: string) => {
    const target = logs.find(l => l.id === logId);
    if (target) {
        const updated = { ...target, approvalStatus: 'Approved' as const, approvedBy: currentUser?.name, approvedAt: new Date().toISOString() };
        await db.logs.update(updated);
        setLogs(prev => prev.map(l => l.id === logId ? updated : l));
        notify("تم اعتماد السجل", "success");
    }
  };

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4"><Loader2 className="animate-spin text-indigo-600" size={48} /><p className="text-gray-600 font-bold">جاري تحميل النظام...</p></div>;
  if (!currentUser) return <LoginScreen employees={employees} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-right print:block" dir="rtl">
      <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-2rem)] md:max-w-sm">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in ${n.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {n.type === 'success' ? <CheckCircle size={20}/> : <Info size={20}/>}
            <p className="text-sm font-bold">{n.message}</p>
          </div>
        ))}
      </div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => setCurrentUser(null)} missingLogsCount={missingLogsCount} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="md:hidden bg-indigo-600 p-4 shadow-md sticky top-0 z-30 flex justify-between items-center text-white">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg"><Menu size={24} /></button>
        <h1 className="text-lg font-bold">مُيسّر المهام</h1>
        <div className="w-8"></div>
      </div>

      <main className="flex-1 md:mr-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <TaskDashboard currentUser={currentUser} logs={logs} employees={employees} onRefresh={() => {}} onStartLogging={() => setActiveTab('daily-log')} onApproveLog={handleApproveLog} onRejectLog={async (id, r) => {}} />}
          {activeTab === 'daily-log' && <DailyLogger currentUser={currentUser} tasks={tasks} assignments={assignments} logs={logs} onSaveLogs={async (l) => { await db.logs.add(l); setLogs(prev => [...l, ...prev]); setActiveTab('dashboard'); }} onCancel={() => setActiveTab('dashboard')} />}
          {activeTab === 'reports' && <AnalyticsReports employees={employees} logs={logs} tasks={tasks} assignments={assignments} />}
          {activeTab === 'admin' && <AdminPanel employees={employees} tasks={tasks} assignments={assignments} logs={logs} systemLogs={systemLogs} onImport={handleImport} onAddAssignment={handleAddAssignment} onDeleteAssignment={handleDeleteAssignment} onAddEmployee={async (e) => { const eWithDate = {...e, lastModified: new Date().toISOString()}; await db.employees.add(eWithDate); setEmployees(p => [...p, eWithDate]); }} onUpdateEmployee={async (e) => { const eWithDate = {...e, lastModified: new Date().toISOString()}; await db.employees.update(eWithDate); setEmployees(p => p.map(x => x.id === e.id ? eWithDate : x)); }} onDeleteEmployee={async (id) => { await db.employees.delete(id); setEmployees(p => p.filter(x => x.id !== id)); }} onAddTask={async (t) => { await db.tasks.add(t); setTasks(p => [...p, t]); }} onUpdateTask={async (t) => { await db.tasks.update(t); setTasks(p => p.map(x => x.id === t.id ? t : x)); }} onDeleteTask={async (id) => { await db.tasks.delete(id); setTasks(p => p.filter(x => x.id !== id)); }} onUpdateLog={() => {}} onDeleteLog={() => {}} onClearData={(type) => { if(type==='all') db.factoryReset(); else db.logs.clear(); }} onApproveLog={handleApproveLog} onRejectLog={() => {}} />}
        </div>
      </main>
    </div>
  );
};

export default App;


import React, { useMemo, useState } from 'react';
import { DashboardStats, TaskLog, Employee } from '../types';
import { BarChart3, CheckCircle2, Trophy, RefreshCw, Briefcase, CalendarCheck, Users, Activity, Clock, Check, X, AlertCircle, FileInput } from 'lucide-react';

interface TaskDashboardProps {
  currentUser: Employee;
  logs: TaskLog[]; 
  employees?: Employee[]; 
  onRefresh: () => void;
  onStartLogging: () => void;
  onApproveLog?: (logId: string) => void;
  onRejectLog?: (logId: string, reason: string) => void;
}

const TaskDashboard: React.FC<TaskDashboardProps> = ({ currentUser, logs, employees = [], onRefresh, onStartLogging, onApproveLog, onRejectLog }) => {
  const isAdmin = currentUser.role === 'Admin';
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // --- Statistics Logic ---
  const stats = useMemo(() => {
    // 1. Filter Logs: For Admin see all, for User see theirs.
    const relevantLogs = isAdmin ? logs : logs.filter(l => l.employeeId === currentUser.id);
    
    // 2. Separate "Approved" from "Pending/Rejected" for statistics
    // The "Official" stats should only reflect APPROVED tasks as requested.
    const approvedLogs = relevantLogs.filter(l => l.approvalStatus === 'Approved');
    const pendingLogs = relevantLogs.filter(l => l.approvalStatus === 'PendingApproval' || !l.approvalStatus); // Handle legacy
    
    // Basic Counts (Based on Approved Logs Only)
    const total = approvedLogs.length;
    
    // Support Arabic & English status check
    const completed = approvedLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
    const pendingTask = approvedLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
    
    // Today's Activity (Approved)
    const todayStr = new Date().toISOString().split('T')[0];
    // Safe check using String()
    const todayApprovedLogs = approvedLogs.filter(l => String(l.logDate || '').startsWith(todayStr));
    const todayCount = todayApprovedLogs.length;

    // Active Employees (For Admin - Based on Approved Logs)
    const activeEmpCount = isAdmin 
      ? new Set(todayApprovedLogs.map(l => l.employeeId)).size 
      : 0;

    // Completion Rate
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Chart Data (Last 7 Days - Approved Only)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Safe check using String()
        const dayLogs = approvedLogs.filter(l => String(l.logDate || '').startsWith(dateStr));
        chartData.push({
            date: dateStr,
            dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
            count: dayLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length,
            total: dayLogs.length
        });
    }

    // Recent Activity Feed (Approved Only for Activity Feed)
    const recentActivity = [...approvedLogs]
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
      .slice(0, 8)
      .map(log => {
        const empName = employees.find(e => e.id === log.employeeId)?.name || log.employeeId;
        return { ...log, empName };
      });

    // Pending Approvals List (For Admin Panel within Dashboard)
    const pendingApprovalsList = isAdmin ? logs.filter(l => l.approvalStatus === 'PendingApproval') : [];

    return { total, completed, pendingTask, todayCount, activeEmpCount, rate, chartData, recentActivity, pendingLogs, pendingApprovalsList };
  }, [logs, currentUser.id, isAdmin, employees]);

  const handleRejectClick = (id: string) => {
      setRejectId(id);
      setRejectReason('');
  };

  const confirmReject = () => {
      if (rejectId && onRejectLog) {
          onRejectLog(rejectId, rejectReason || 'تم الرفض من قبل المدير');
          setRejectId(null);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isAdmin ? <Activity className="text-indigo-600"/> : null} 
            {isAdmin ? 'لوحة القيادة العامة' : `أهلاً بك، ${currentUser.name}`}
          </h2>
          <p className="text-gray-500 mt-1">
            {isAdmin 
              ? 'نظرة شاملة على أداء المؤسسة وحركة الموظفين' 
              : 'إليك ملخص أدائك الشخصي ومهامك المنجزة (المعتمدة)'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={18} />
          </button>
          {!isAdmin && (
            <button onClick={onStartLogging} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors">
              تسجيل مهام اليوم
            </button>
          )}
        </div>
      </div>

      {/* --- ADMIN: APPROVAL CENTER --- */}
      {isAdmin && stats.pendingApprovalsList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm mb-8 animate-bounce-soft">
              <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                        <AlertCircle size={20} />
                        مركز الاعتمادات (تقارير معلقة: {stats.pendingApprovalsList.length})
                    </h3>
                    <p className="text-xs text-amber-600 mt-1">
                      الاعتماد يقوم بترحيل المهمة للسجل الرسمي. الرفض يمنع احتساب المهمة للموظف.
                    </p>
                  </div>
              </div>
              
              <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                  {stats.pendingApprovalsList.slice(0, 5).map(log => {
                      const empName = employees.find(e => e.id === log.employeeId)?.name || log.employeeId;
                      return (
                          <div key={log.id} className="p-4 border-b border-gray-100 last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-gray-900">{empName}</p>
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{new Date(log.logDate).toLocaleDateString('ar-EG')}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${log.status==='Completed' || log.status==='منفذة'?'bg-green-500':'bg-red-500'}`}></span>
                                    {log.description}
                                  </p>
                              </div>
                              
                              {rejectId === log.id ? (
                                  <div className="flex items-center gap-2 w-full md:w-auto animate-fade-in bg-red-50 p-2 rounded-lg border border-red-100">
                                      <input 
                                        type="text" 
                                        placeholder="سبب الرفض..." 
                                        className="border border-red-200 rounded px-2 py-1 text-sm flex-1 md:w-48 focus:ring-red-500 focus:border-red-500 outline-none"
                                        autoFocus
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                      />
                                      <button onClick={confirmReject} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">تأكيد</button>
                                      <button onClick={() => setRejectId(null)} className="text-gray-500 text-xs underline">إلغاء</button>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                      <button onClick={() => onApproveLog && onApproveLog(log.id)} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all hover:scale-105">
                                          <Check size={16} /> اعتماد وترحيل
                                      </button>
                                      <button onClick={() => handleRejectClick(log.id)} className="flex items-center gap-1 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-all">
                                          <X size={16} /> رفض
                                      </button>
                                  </div>
                              )}
                          </div>
                      )
                  })}
                  {stats.pendingApprovalsList.length > 5 && (
                      <div className="p-3 text-center bg-gray-50 text-xs text-gray-500 font-bold border-t hover:bg-gray-100 cursor-pointer">
                          +{stats.pendingApprovalsList.length - 5} سجلات أخرى معلقة (انتقل لسجل المهام للمراجعة الكاملة)
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-gray-500 text-xs font-bold mb-1">{isAdmin ? 'إجمالي السجلات المعتمدة' : 'مهامي المعتمدة'}</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Briefcase size={20} /></div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-gray-500 text-xs font-bold mb-1">نسبة الإنجاز (المعتمدة)</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.rate}%</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-green-600"><Trophy size={20} /></div>
          </div>
        </div>

        {/* Card 3 (Conditional) */}
        {isAdmin ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500"></div>
                <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">الموظفين النشطين (اليوم)</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.activeEmpCount}</h3>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Users size={20} /></div>
                </div>
            </div>
        ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
                <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">تقاريري المعلقة</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.pendingLogs.length}</h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock size={20} /></div>
                </div>
            </div>
        )}

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-gray-500 text-xs font-bold mb-1">نشاط اليوم المعتمد</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.todayCount}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <BarChart3 className="text-indigo-600" size={20} />
               {isAdmin ? 'مؤشر الأداء العام (المعتمد)' : 'مؤشر أدائي الأسبوعي'}
             </h3>
           </div>
           
           <div className="h-64 flex items-end justify-between gap-2 px-2">
              {stats.chartData.map((day, idx) => {
                 const maxScale = Math.max(...stats.chartData.map(d => d.total), 5);
                 const heightPercent = Math.min((day.count / maxScale) * 100, 100);
                 return (
                   <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                      <div className="relative w-full max-w-[40px] bg-gray-100 rounded-t-lg h-full flex items-end overflow-hidden">
                          <div className="w-full bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-500 rounded-t-lg relative" style={{ height: `${heightPercent}%` }}>
                             {day.count > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-indigo-700 bg-indigo-50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{day.count}</span>}
                          </div>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{day.dayName}</span>
                   </div>
                 )
              })}
           </div>
        </div>

        {/* Recent Activity Feed (For Admins) or Stats (For Users) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="text-indigo-600" size={20} />
                {isAdmin ? 'أحدث الأنشطة المعتمدة' : 'آخر مهامي المعتمدة'}
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[300px] custom-scrollbar">
                {stats.recentActivity.length > 0 ? stats.recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                             log.status === 'Completed' || log.status === 'منفذة' ? 'bg-green-100 text-green-700' : 
                             log.status === 'Pending' || log.status === 'غير منفذة' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                         }`}>
                             {log.status === 'Completed' || log.status === 'منفذة' ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                         </div>
                         <div className="flex-1 min-w-0">
                             {isAdmin && <p className="text-xs font-bold text-indigo-700 mb-0.5">{log.empName}</p>}
                             <p className="text-xs text-gray-800 font-medium truncate">{log.description}</p>
                             <p className="text-[10px] text-gray-400 mt-1 flex justify-between">
                                 <span>{new Date(log.logDate).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                 <span>{new Date(log.logDate).toLocaleDateString('ar-EG')}</span>
                             </p>
                         </div>
                    </div>
                )) : (
                    <div className="text-center text-gray-400 py-10">لا توجد أنشطة معتمدة حديثة</div>
                )}
            </div>
            {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <button onClick={() => {}} className="text-xs text-indigo-600 font-bold hover:underline">عرض سجل النظام الكامل</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskDashboard;

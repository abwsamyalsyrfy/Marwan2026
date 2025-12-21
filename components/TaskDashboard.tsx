
import React, { useMemo, useState } from 'react';
import { DashboardStats, TaskLog, Employee } from '../types';
import { BarChart3, CheckCircle2, Trophy, RefreshCw, Briefcase, CalendarCheck, Users, Activity, Clock, Check, X, AlertCircle, Calendar } from 'lucide-react';

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
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  const stats = useMemo(() => {
    const relevantLogs = isAdmin ? logs : logs.filter(l => l.employeeId === currentUser.id);
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // فلترة السجلات المعتمدة حسب الفترة الزمنية المختارة للمؤشر
    const timeFilteredApprovedLogs = relevantLogs.filter(l => {
        if (l.approvalStatus !== 'Approved') return false;
        const logDate = new Date(l.logDate);
        if (timeRange === 'today') return l.logDate.startsWith(todayStr);
        if (timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return logDate >= weekAgo;
        }
        if (timeRange === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            return logDate >= monthAgo;
        }
        return true;
    });

    const total = timeFilteredApprovedLogs.filter(l => l.status !== 'Leave').length;
    const completed = timeFilteredApprovedLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // بيانات الرسم البياني
    const chartData = [];
    const daysToLookBack = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
    
    for (let i = daysToLookBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLogs = relevantLogs.filter(l => l.approvalStatus === 'Approved' && l.logDate.startsWith(dateStr));
        
        chartData.push({
            date: dateStr,
            label: timeRange === 'month' ? d.getDate().toString() : d.toLocaleDateString('ar-EG', { weekday: 'short' }),
            count: dayLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length,
            total: dayLogs.filter(l => l.status !== 'Leave').length
        });
    }

    const pendingApprovalsList = isAdmin ? logs.filter(l => l.approvalStatus === 'PendingApproval') : [];
    const pendingCount = relevantLogs.filter(l => l.approvalStatus === 'PendingApproval').length;

    const recentActivity = [...relevantLogs]
      .filter(l => l.approvalStatus === 'Approved')
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
      .slice(0, 8)
      .map(log => ({ ...log, empName: employees.find(e => e.id === log.employeeId)?.name || log.employeeId }));

    return { total, completed, rate, chartData, recentActivity, pendingCount, pendingApprovalsList };
  }, [logs, currentUser.id, isAdmin, employees, timeRange]);

  const handleRejectClick = (id: string) => {
      setRejectId(id);
      setRejectReason('');
  };

  const confirmReject = () => {
      if (rejectId && onRejectLog) {
          onRejectLog(rejectId, rejectReason || 'تم الرفض من قبل الإدارة');
          setRejectId(null);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Time Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isAdmin ? <Activity className="text-indigo-600"/> : null} 
            {isAdmin ? 'لوحة القيادة الإدارية' : `أهلاً بك، ${currentUser.name}`}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">متابعة مؤشرات الأداء والمهام المعتمدة</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
             <button onClick={() => setTimeRange('today')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange==='today'?'bg-white shadow-sm text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>اليوم</button>
             <button onClick={() => setTimeRange('week')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange==='week'?'bg-white shadow-sm text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>الأسبوع</button>
             <button onClick={() => setTimeRange('month')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange==='month'?'bg-white shadow-sm text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>الشهر</button>
          </div>
          <button onClick={onRefresh} className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-indigo-600 hover:border-indigo-100 transition-all">
            <RefreshCw size={18} />
          </button>
          {!isAdmin && (
            <button onClick={onStartLogging} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold transition-all">
              <Calendar size={18} /> تسجيل المهام
            </button>
          )}
        </div>
      </div>

      {/* Admin Approval Queue */}
      {isAdmin && stats.pendingApprovalsList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm mb-8">
              <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-4">
                  <AlertCircle size={20} />
                  طلبات معلقة وتحتاج اعتماد ({stats.pendingApprovalsList.length})
              </h3>
              <div className="bg-white rounded-xl border border-amber-100 divide-y divide-gray-50">
                  {stats.pendingApprovalsList.map(log => (
                      <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-50/30 transition-colors">
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${log.taskId === 'LEAVE' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                 {log.empName?.charAt(0) || 'م'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{log.empName}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  {log.taskId === 'LEAVE' ? <CalendarCheck size={14} className="text-orange-500" /> : <Briefcase size={14} className="text-gray-400" />}
                                  {log.description}
                                </p>
                              </div>
                          </div>
                          {rejectId === log.id ? (
                              <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100 animate-fade-in">
                                  <input type="text" placeholder="سبب الرفض..." className="border border-red-200 rounded px-3 py-1.5 text-sm outline-none w-48" autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                  <button onClick={confirmReject} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">تأكيد الرفض</button>
                                  <button onClick={() => setRejectId(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                              </div>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => onApproveLog && onApproveLog(log.id)} className="flex items-center gap-1.5 bg-green-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"><Check size={16} /> اعتماد</button>
                                  <button onClick={() => handleRejectClick(log.id)} className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-5 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-all"><X size={16} /> رفض</button>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500"></div>
          <p className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider">مؤشر الإنجاز المعتمد</p>
          <div className="flex items-center justify-center gap-3">
             <h3 className="text-5xl font-black text-gray-900">{stats.rate}%</h3>
             <Activity className="text-indigo-100 group-hover:text-indigo-200 transition-colors" size={48} />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-bold">بناءً على التقارير المعتمدة لـ {timeRange === 'today' ? 'اليوم' : timeRange === 'week' ? 'آخر 7 أيام' : 'آخر 30 يوماً'}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
              <p className="text-gray-400 text-xs font-bold mb-1">المهام المنجزة</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.completed}</h3>
              <p className="text-[10px] text-green-600 font-bold mt-1">من أصل {stats.total} مهمة</p>
           </div>
           <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <CheckCircle2 size={32} />
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
              <p className="text-gray-400 text-xs font-bold mb-1">تقارير معلقة</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingCount}</h3>
              <p className="text-[10px] text-amber-600 font-bold mt-1">بانتظار مراجعة الإدارة</p>
           </div>
           <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={32} />
           </div>
        </div>
      </div>

      {/* Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="text-indigo-600" size={24} />
                تطور الأداء
              </h3>
              <div className="flex gap-4 text-[10px] font-bold">
                 <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span> منجزة</div>
                 <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-100 rounded-sm"></span> إجمالي</div>
              </div>
           </div>
           <div className="h-64 flex items-end justify-between gap-2 px-2">
              {stats.chartData.map((day, idx) => {
                 const maxVal = Math.max(...stats.chartData.map(d => d.total), 1);
                 const h = (day.count / maxVal) * 100;
                 return (
                   <div key={idx} className="flex flex-col items-center gap-2 flex-1 group h-full justify-end">
                      <div className="relative w-full max-w-[28px] bg-gray-50 rounded-t-lg h-full flex items-end overflow-hidden border-x border-t border-gray-100/50">
                          <div className="w-full bg-indigo-500 group-hover:bg-indigo-600 transition-all rounded-t-md shadow-sm" style={{ height: `${Math.max(h, 0)}%` }}></div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{day.label}</span>
                   </div>
                 )
              })}
           </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
               <Activity className="text-indigo-600" size={24} /> 
               أحدث الاعتمادات
            </h3>
            <div className="space-y-6 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {stats.recentActivity.length > 0 ? stats.recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-4 items-start relative pb-6 border-r-2 border-gray-100 pr-4 last:border-r-0">
                         <div className={`absolute -right-1.5 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${log.status === 'Completed' || log.status === 'منفذة' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                         <div className="flex-1 min-w-0">
                             {isAdmin && <p className="text-xs font-black text-indigo-700 mb-0.5">{log.empName}</p>}
                             <p className="text-sm text-gray-800 font-bold leading-tight line-clamp-2">{log.description}</p>
                             <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">{new Date(log.logDate).toLocaleDateString('ar-EG')}</span>
                                {log.taskId === 'LEAVE' && <span className="text-[10px] font-bold text-orange-600 px-1.5 py-0.5 bg-orange-50 rounded">إجازة</span>}
                             </div>
                         </div>
                    </div>
                )) : (
                  <div className="text-center py-20 flex flex-col items-center gap-4 text-gray-300">
                     <AlertCircle size={48} strokeWidth={1} />
                     <p className="text-sm font-bold">لا يوجد نشاط معتمد مؤخراً</p>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDashboard;


import React, { useMemo, useState, useEffect } from 'react';
import { DashboardStats, TaskLog, Employee, TeamInsight, Task, Assignment } from '../types';
import { 
  BarChart3, CheckCircle2, Trophy, RefreshCw, Briefcase, 
  CalendarCheck, Users, Activity, Clock, Check, X, 
  AlertCircle, Sparkles, Loader2, ArrowUpRight, 
  TrendingUp, Zap, Target, Award, ChevronRight, PieChart,
  ShieldCheck, AlertOctagon, UserCheck, UserX, MessageSquare,
  LayoutGrid, ListChecks, Layers, CalendarDays
} from 'lucide-react';
import { getTeamPerformanceInsights } from '../services/geminiService';
import { db } from '../services/db';

interface TaskDashboardProps {
  currentUser: Employee;
  logs: TaskLog[]; 
  employees?: Employee[]; 
  tasks?: Task[];
  assignments?: Assignment[];
  onRefresh: () => void;
  onStartLogging: () => void;
  onApproveLog?: (logId: string) => void;
  onRejectLog?: (logId: string, reason: string) => void;
}

const TaskDashboard: React.FC<TaskDashboardProps> = ({ 
  currentUser, logs, employees = [], tasks = [], assignments = [], 
  onRefresh, onStartLogging, onApproveLog, onRejectLog 
}) => {
  const isAdmin = currentUser.role === 'Admin';
  
  // AI Insight State
  const [insights, setInsights] = useState<TeamInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const loadCached = async () => {
      if (!isAdmin) return;
      const cached = await db.insights.getLatest();
      if (cached) setInsights(cached);
    };
    loadCached();
  }, [isAdmin]);

  const generateNewInsights = async () => {
    if (!isAdmin || logs.length === 0) return;
    setLoadingInsights(true);
    try {
      const data = await getTeamPerformanceInsights(logs, employees);
      const insightWithTime: TeamInsight = {
        ...data,
        generatedAt: new Date().toISOString()
      };
      await db.insights.save(insightWithTime);
      setInsights(insightWithTime);
    } catch (e) {
      console.error(e);
      alert("تعذر توليد التحليلات حالياً، يرجى المحقق من الاتصال.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // helper to filter by days ago
    const getLogsInLastDays = (logList: TaskLog[], days: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return logList.filter(l => new Date(l.logDate) >= cutoff);
    };

    // Calculate generic stats based on role
    if (isAdmin) {
      const todayLogs = logs.filter(l => l.logDate.startsWith(todayStr));
      const weekLogs = getLogsInLastDays(logs, 7);
      
      const calcRate = (list: TaskLog[]) => {
        const relevant = list.filter(l => l.status !== 'Leave' && l.status !== 'إجازة' && l.status !== 'عطلة');
        if (relevant.length === 0) return 0;
        const completed = relevant.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
        return Math.round((completed / relevant.length) * 100);
      };

      const activeStaffToday = new Set(todayLogs.map(l => l.employeeId)).size;
      const pendingApprovalsList = logs.filter(l => l.approvalStatus === 'PendingApproval');

      // 7-Day Trend for Team
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayLogs = logs.filter(l => l.logDate.startsWith(dateStr));
          chartData.push({
              dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
              completed: dayLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length,
              total: dayLogs.length
          });
      }

      return {
        isAdmin: true,
        todayRate: calcRate(todayLogs),
        weekRate: calcRate(weekLogs),
        activeStaffToday,
        totalStaff: employees.length,
        pendingApprovalsCount: pendingApprovalsList.length,
        pendingApprovalsList: pendingApprovalsList.slice(0, 10),
        chartData
      };
    } else {
      // Individual Mode
      const myLogs = logs.filter(l => l.employeeId === currentUser.id);
      const myTodayLogs = myLogs.filter(l => l.logDate.startsWith(todayStr));
      const myWeekLogs = getLogsInLastDays(myLogs, 7);
      const myMonthLogs = getLogsInLastDays(myLogs, 30);

      const calcRate = (list: TaskLog[]) => {
        const relevant = list.filter(l => l.status !== 'Leave' && l.status !== 'إجازة' && l.status !== 'عطلة');
        if (relevant.length === 0) return 0;
        const completed = relevant.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
        return Math.round((completed / relevant.length) * 100);
      };

      const myAssignments = assignments.filter(a => a.employeeId === currentUser.id);
      const completedToday = myTodayLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
      const progressToday = myAssignments.length > 0 ? Math.round((completedToday / myAssignments.length) * 100) : 0;

      // 7-Day Trend for Individual
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayLogs = myLogs.filter(l => l.logDate.startsWith(dateStr));
          chartData.push({
              dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
              completed: dayLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length,
              total: dayLogs.length
          });
      }

      return {
        isAdmin: false,
        todayRate: calcRate(myTodayLogs),
        weekRate: calcRate(myWeekLogs),
        monthRate: calcRate(myMonthLogs),
        progressToday,
        completedToday,
        totalAssigned: myAssignments.length,
        chartData
      };
    }
  }, [logs, currentUser.id, isAdmin, assignments, employees]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            {isAdmin ? (
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                <ShieldCheck size={32} />
              </div>
            ) : (
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-100">
                <Zap size={32} fill="white" />
              </div>
            )}
            {isAdmin ? 'مركز قيادة الفريق' : `أداءك الشخصي، ${currentUser.name.split(' ')[0]}`}
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            {isAdmin 
              ? `يوجد ${stats.pendingApprovalsCount} سجل بانتظار مراجعتك حالياً.` 
              : `لقد أنجزت ${stats.completedToday} مهمة روتينية اليوم.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onStartLogging}
            className="flex items-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <PlusIcon /> {isAdmin ? 'إضافة سجل يدوي' : 'تسجيل مهام اليوم'}
          </button>
          <button onClick={onRefresh} className="p-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Main KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard label="إنجاز الفريق اليوم" value={`${stats.todayRate}%`} subLabel="معدل تنفيذ المهام اليومي" icon={<Target className="text-blue-600" />} color="blue" />
            <StatCard label="التزام الأسبوع" value={`${stats.weekRate}%`} subLabel="أداء الفريق خلال 7 أيام" icon={<CalendarCheck className="text-indigo-600" />} color="indigo" />
            <StatCard label="الموظفين النشطين" value={`${stats.activeStaffToday}/${stats.totalStaff}`} subLabel="من سجلوا تقاريرهم اليوم" icon={<Users className="text-emerald-600" />} color="emerald" />
            <StatCard label="طلبات المراجعة" value={stats.pendingApprovalsCount} subLabel="بانتظار الاعتماد" icon={<Clock className="text-amber-600" />} color="amber" />
          </>
        ) : (
          <>
            <StatCard label="إنجازك اليوم" value={`${stats.todayRate}%`} subLabel={`${stats.completedToday} مهمة مكتملة`} icon={<Zap className="text-amber-600" />} color="amber" />
            <StatCard label="إنجازك الأسبوعي" value={`${stats.weekRate}%`} subLabel="خلال آخر 7 أيام" icon={<Trophy className="text-indigo-600" />} color="indigo" />
            <StatCard label="إنجازك الشهري" value={`${stats.monthRate}%`} subLabel="خلال آخر 30 يوم" icon={<CalendarDays className="text-blue-600" />} color="blue" />
            <StatCard label="الترتيب الحالي" value="#1" subLabel="بناءً على الالتزام بالوقت" icon={<Award className="text-emerald-600" />} color="emerald" />
          </>
        )}
      </div>

      {/* Grid: Action Center & Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Urgent Actions (Admins) / Daily Progress (Users) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {isAdmin ? (
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100 border border-gray-100 p-6 flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <ListChecks size={20} className="text-amber-600" /> مراجعة سريعة
                </h3>
                <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-black">
                  {stats.pendingApprovalsCount} طلب
                </span>
              </div>
              
              <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar flex-1">
                {stats.pendingApprovalsList && stats.pendingApprovalsList.length > 0 ? stats.pendingApprovalsList.map(log => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  return (
                    <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 group hover:border-indigo-200 hover:bg-white transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-black text-gray-900">{emp?.name || 'موظف'}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{log.description}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${log.taskType === 'Daily' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {log.taskType === 'Daily' ? 'روتين' : 'إضافي'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => onApproveLog?.(log.id)} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">اعتماد</button>
                        <button onClick={() => onRejectLog?.(log.id, 'رفض سريع')} className="px-3 py-1.5 bg-white border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"><X size={14}/></button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <CheckCircle2 size={48} className="mb-2" />
                    <p className="text-sm font-bold">لا توجد سجلات معلقة</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[450px]">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12">
                 <Target size={180} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-8">إنجازك اليوم</h3>
              <div className="relative w-48 h-48 mb-10 scale-110">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-100" />
                  <circle 
                    cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="14" fill="transparent" 
                    strokeDasharray={540.35}
                    strokeDashoffset={540.35 - (540.35 * (stats.isAdmin ? 0 : stats.progressToday)) / 100}
                    strokeLinecap="round"
                    className="text-indigo-600 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-gray-900">{stats.isAdmin ? '0' : stats.progressToday}%</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">التقدم اليومي</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-8 font-medium">الاستمرار في تسجيل المهام يرفع من نقاط تميزك</p>
              <button onClick={onStartLogging} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl">
                سجل مهامك الآن <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Performance Trends (Common) */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <BarChart3 className="text-indigo-600" size={24} />
                {isAdmin ? 'مؤشرات أداء الفريق الأسبوعية' : 'سجل التزامك الشخصي (7 أيام)'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">رسم بياني يوضح حجم المهام المنجزة يومياً</p>
            </div>
            
            <div className="flex gap-4 p-1.5 bg-gray-50 rounded-xl">
               <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  <span className="text-[10px] font-black text-gray-700">المنجز</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <span className="w-2.5 h-2.5 bg-gray-200 rounded-full"></span>
                  <span className="text-[10px] font-black text-gray-500">الإجمالي</span>
               </div>
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-6 px-4 mb-4">
            {stats.chartData && stats.chartData.map((day, idx) => {
              const maxVal = Math.max(...stats.chartData.map(d => d.total), 1);
              const heightTotal = (day.total / maxVal) * 100;
              const heightComp = day.total > 0 ? (day.completed / day.total) * 100 : 0;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-4 group cursor-default">
                  <div className="w-full max-w-[50px] h-64 flex items-end justify-center relative">
                    <div className="w-full bg-gray-100 rounded-t-2xl absolute bottom-0 transition-all duration-300 group-hover:bg-gray-200" style={{ height: `${heightTotal}%` }}></div>
                    <div className="w-full bg-indigo-600 rounded-t-2xl absolute bottom-0 transition-all duration-500 group-hover:bg-indigo-700 shadow-lg shadow-indigo-100" style={{ height: `${(heightComp / 100) * heightTotal}%` }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl z-20 transition-all duration-300 scale-90 group-hover:scale-100">
                        {day.completed} سجل منجز
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-gray-400 group-hover:text-gray-900 transition-colors uppercase tracking-tighter">{day.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strategic Advisor (AI Insights) */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20 group">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000">
              <Sparkles size={200} />
           </div>
           
           <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                 <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-2xl rounded-[1.5rem] flex items-center justify-center border border-white/20 shadow-inner">
                      <Sparkles size={32} className="text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">المستشار الاستراتيجي الذكي</h3>
                      <p className="text-indigo-300 text-sm mt-1">تحليل أداء الفريق بواسطة Gemini AI</p>
                    </div>
                 </div>
                 <button 
                  onClick={generateNewInsights} 
                  disabled={loadingInsights}
                  className="flex items-center gap-3 px-8 py-3.5 bg-white text-indigo-950 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-2xl shadow-white/5 active:scale-95 disabled:opacity-50"
                 >
                    {loadingInsights ? <Loader2 size={20} className="animate-spin"/> : <RefreshCw size={20} />}
                    توليد تحليل جديد
                 </button>
              </div>

              {loadingInsights ? (
                <div className="flex flex-col items-center justify-center py-24 gap-6 text-indigo-200">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                    <Loader2 className="animate-spin relative" size={64} strokeWidth={3} />
                  </div>
                  <p className="font-bold text-xl tracking-wide animate-pulse">جاري فحص سجلات الفريق واستخراج التوصيات...</p>
                </div>
              ) : insights ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                   <div className="xl:col-span-7 space-y-8">
                      <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
                         <h4 className="text-amber-400 font-black mb-6 text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                           <ShieldCheck size={18} /> رؤية الأداء العام
                         </h4>
                         <p className="text-indigo-50 leading-relaxed text-xl font-medium">{insights.summary}</p>
                         
                         <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                            <div>
                               <span className="text-[10px] text-indigo-400 font-black uppercase block mb-2 tracking-widest">مؤشر الإنتاجية</span>
                               <div className="flex items-center gap-3">
                                  <span className="text-5xl font-black">{insights.productivityScore}%</span>
                                  <TrendingUp className="text-emerald-400" size={24} />
                               </div>
                            </div>
                            <div>
                               <span className="text-[10px] text-indigo-400 font-black uppercase block mb-2 tracking-widest">تحديات مرصودة</span>
                               <div className="flex flex-wrap gap-2">
                                  {insights.bottlenecks.map((b, i) => (
                                    <span key={i} className="bg-red-500/10 text-red-200 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold">{b}</span>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="xl:col-span-5 bg-white/5 backdrop-blur-sm rounded-[2.5rem] p-8 border border-white/10">
                      <h4 className="text-indigo-200 font-black mb-8 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Zap size={20} className="text-amber-400" /> مهام مقترح أتمتتها أو ترحيلها
                      </h4>
                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                        {insights.suggestedRoutineTasks.map((task, i) => (
                          <div key={i} className="group bg-indigo-500/10 p-6 rounded-[1.5rem] border border-indigo-400/10 hover:border-indigo-400/40 hover:bg-indigo-500/20 transition-all duration-300">
                             <p className="font-black text-white text-lg mb-3 group-hover:text-amber-300 transition-colors">{task.description}</p>
                             <div className="flex gap-3">
                                <MessageSquare size={16} className="text-indigo-400 shrink-0 mt-1" />
                                <p className="text-indigo-300/80 text-xs italic leading-relaxed">{task.reason}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              ) : (
                <div className="text-center py-24 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <LayoutGrid size={32} className="text-indigo-400" />
                   </div>
                   <p className="text-indigo-200 font-bold mb-8 text-lg">بانتظار البيانات لتوليد الرؤى الاستراتيجية للفريق</p>
                   <button onClick={generateNewInsights} className="px-10 py-4 bg-white text-indigo-950 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl">تحليل السجلات الآن</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

// --- Helper Components ---

const StatCard = ({ label, value, subLabel, icon, color }: { label: string, value: string | number, subLabel: string, icon: React.ReactNode, color: string }) => {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  const borderColors: Record<string, string> = {
    amber: 'border-amber-100',
    indigo: 'border-indigo-100',
    emerald: 'border-emerald-100',
    blue: 'border-blue-100'
  };

  return (
    <div className={`bg-white p-7 rounded-[2rem] shadow-sm border ${borderColors[color]} group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-1.5 h-full ${color === 'amber' ? 'bg-amber-500' : color === 'indigo' ? 'bg-indigo-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-xs font-black mb-2 uppercase tracking-widest">{label}</p>
          <h3 className="text-4xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{value}</h3>
          <p className="text-[10px] text-gray-500 mt-3 font-bold">{subLabel}</p>
        </div>
        <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform shadow-inner`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default TaskDashboard;

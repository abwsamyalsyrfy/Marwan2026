
import React, { useMemo, useState, useEffect } from 'react';
import { TaskLog, Employee, TeamInsight, Assignment, Announcement, AnnouncementReply } from '../types';
import { 
  BarChart3, CheckCircle2, RefreshCw, 
  CalendarCheck, Users, Clock, Check, X, 
  Sparkles, Loader2, TrendingUp, Zap, Target, 
  ChevronRight, ShieldCheck, MessageSquare,
  LayoutGrid, ListChecks, CalendarDays, AlertTriangle, AlertCircle, Megaphone, Heart, Send, Copy, EyeOff, ShieldAlert,
  CircleDot, XCircle, MinusCircle, User, Activity, CheckSquare
} from 'lucide-react';
import { getTeamPerformanceInsights } from '../services/geminiService';
import { db } from '../services/db';

interface TaskDashboardProps {
  currentUser: Employee;
  logs: TaskLog[]; 
  employees?: Employee[]; 
  assignments?: Assignment[];
  announcements?: Announcement[];
  onRefresh: () => void;
  onStartLogging: () => void;
  onApproveLog?: (logId: string) => void;
  onRejectLog?: (logId: string, reason: string) => void;
  onCommitLog?: (logId: string) => void; 
}

const TaskDashboard: React.FC<TaskDashboardProps> = ({ 
  currentUser, logs, employees = [], assignments = [], announcements = [],
  onRefresh, onStartLogging, onApproveLog, onRejectLog, onCommitLog
}) => {
  const isAdmin = currentUser.role === 'Admin';
  
  const [insights, setInsights] = useState<TeamInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [dismissedRejectedIds, setDismissedRejectedIds] = useState<string[]>([]);
  const [committingIds, setCommittingIds] = useState<string[]>([]);
  const [processingLogIds, setProcessingLogIds] = useState<string[]>([]);

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
      const insightWithTime: TeamInsight = { ...data, generatedAt: new Date().toISOString() };
      await db.insights.save(insightWithTime);
      setInsights(insightWithTime);
    } catch (e) { console.error(e); } finally { setLoadingInsights(false); }
  };

  const handleQuickApprove = async (logId: string) => {
    if (!onApproveLog) return;
    setProcessingLogIds(prev => [...prev, logId]);
    await onApproveLog(logId);
    setProcessingLogIds(prev => prev.filter(id => id !== logId));
  };

  const handleQuickReject = async (logId: string) => {
    if (!onRejectLog) return;
    const reason = window.prompt("سبب الرفض:");
    if (reason !== null) {
      setProcessingLogIds(prev => [...prev, logId]);
      await onRejectLog(logId, reason || "تم الرفض من اللوحة السريعة");
      setProcessingLogIds(prev => prev.filter(id => id !== logId));
    }
  };

  const handleLike = async (annId: string, hasLiked: boolean) => {
    try {
      await db.announcements.toggleLike(annId, currentUser.id, hasLiked);
      onRefresh(); 
    } catch (e) { console.error(e); }
  };

  const handleReply = async (annId: string) => {
    const content = replyInputs[annId];
    if (!content?.trim()) return;

    const newReply: AnnouncementReply = {
      id: `REP-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await db.announcements.addReply(annId, newReply);
      setReplyInputs(prev => ({ ...prev, [annId]: '' }));
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const handleCommitClick = async (logId: string) => {
    setCommittingIds(prev => [...prev, logId]);
    if (onCommitLog) {
      await onCommitLog(logId);
    }
    setCommittingIds(prev => prev.filter(id => id !== logId));
  };

  const isLeaveStatus = (status: string) => ['Leave', 'إجازة', 'عطلة'].includes(status);
  const isCompletedStatus = (status: string) => ['Completed', 'منفذة'].includes(status);
  const isNotApplicableStatus = (status: string) => ['NotApplicable', 'لا تنطبق'].includes(status);
  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 4 || day === 5;
  };

  const relevantAnnouncements = useMemo(() => {
    if (isAdmin) return announcements;
    return announcements.filter(ann => 
      ann.targetType === 'All' || (ann.targetEmployeeIds && ann.targetEmployeeIds.includes(currentUser.id))
    );
  }, [announcements, currentUser.id, isAdmin]);

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    
    const getLogsInLastDays = (logList: TaskLog[], days: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return logList.filter(l => new Date(l.logDate) >= cutoff);
    };

    const calcRate = (list: TaskLog[]) => {
      const relevant = list.filter(l => !isLeaveStatus(l.status));
      if (relevant.length === 0) return 0;
      const doneOrNA = relevant.filter(l => isCompletedStatus(l.status) || isNotApplicableStatus(l.status)).length;
      return Math.round((doneOrNA / relevant.length) * 100);
    };

    const getStatusDistribution = (list: TaskLog[]) => {
      return {
        completed: list.filter(l => isCompletedStatus(l.status)).length,
        pending: list.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length,
        na: list.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length,
        total: list.length
      };
    };

    if (isAdmin) {
      const todayLogs = logs.filter(l => l.logDate.startsWith(todayStr));
      const weekLogs = getLogsInLastDays(logs, 7);
      
      const activeStaffToday = new Set(todayLogs.map(l => l.employeeId)).size;
      const pendingApprovalsList = logs
        .filter(l => l.approvalStatus === 'PendingApproval' || l.approvalStatus === 'CommitmentPending')
        .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()); // فرز بالأحدث

      const chartData = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-CA');
          const dayLogs = logs.filter(l => l.logDate.startsWith(dateStr));
          chartData.push({
              dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
              completed: dayLogs.filter(l => isCompletedStatus(l.status)).length,
              total: dayLogs.length
          });
      }

      const recentTeamLogs = [...logs]
        .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
        .slice(0, 6);

      return {
        isAdmin: true,
        todayRate: calcRate(todayLogs),
        weekRate: calcRate(weekLogs),
        activeStaffToday,
        totalStaff: employees.length,
        pendingApprovalsCount: pendingApprovalsList.length,
        pendingApprovalsList: pendingApprovalsList.slice(0, 6), 
        recentTeamLogs,
        chartData,
        distribution: getStatusDistribution(todayLogs)
      };
    } else {
      const myLogs = logs.filter(l => l.employeeId === currentUser.id);
      const myTodayLogs = myLogs.filter(l => l.logDate.startsWith(todayStr));
      const myWeekLogs = getLogsInLastDays(myLogs, 7);
      const myMonthLogs = getLogsInLastDays(myLogs, 30);

      const progressToday = myTodayLogs.length > 0 ? calcRate(myTodayLogs) : 0;
      const completedToday = myTodayLogs.filter(l => isCompletedStatus(l.status)).length;
      
      const reportingDays = new Set(
        myLogs
          .filter(l => {
            const datePart = l.logDate.split('T')[0];
            return l.taskType === 'Daily' && !isLeaveStatus(l.status) && !isWeekend(datePart);
          })
          .map(l => l.logDate.split('T')[0])
      ).size;

      const myRejectedLogs = myLogs.filter(l => l.approvalStatus === 'Rejected' || l.approvalStatus === 'CommitmentPending');
      const myPendingLogs = myLogs.filter(l => l.approvalStatus === 'PendingApproval');

      const chartData = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-CA');
          const dayLogs = myLogs.filter(l => l.logDate.startsWith(dateStr));
          chartData.push({
              dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
              completed: dayLogs.filter(l => isCompletedStatus(l.status)).length,
              total: dayLogs.length
          });
      }

      return {
        isAdmin: false,
        todayRate: progressToday,
        weekRate: calcRate(myWeekLogs),
        monthRate: calcRate(myMonthLogs),
        progressToday, 
        completedToday,
        reportingDays,
        chartData,
        myRejectedLogs, 
        myPendingCount: myPendingLogs.length,
        distribution: getStatusDistribution(myTodayLogs)
      };
    }
  }, [logs, currentUser.id, isAdmin, assignments, employees]);

  const visibleRejectedLogs = useMemo(() => {
    return (stats.myRejectedLogs || []).filter(l => !dismissedRejectedIds.includes(l.id));
  }, [stats.myRejectedLogs, dismissedRejectedIds]);

  const handleCopyDescription = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ وصف المهمة، يمكنك استخدامه عند إعادة التسجيل.');
  };

  const handleDismissLog = (id: string) => {
    setDismissedRejectedIds(prev => [...prev, id]);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60)
    if (hrs > 24) return new Date(dateStr).toLocaleDateString('ar-EG');
    if (hrs > 0) return `قبل ${hrs} ساعة`;
    if (mins > 0) return `قبل ${mins} دقيقة`;
    return 'الآن';
  };

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
              ? `يوجد ${stats.pendingApprovalsCount || 0} سجل بانتظار مراجعتك حالياً.` 
              : `لديك ${stats.myPendingCount} سجل قيد الانتظار حالياً.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onStartLogging} className="flex items-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95">
            <PlusIcon /> {isAdmin ? 'إضافة سجل يدوي' : 'تسجيل مهام اليوم'}
          </button>
          <button onClick={onRefresh} className="p-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Announcements */}
      {relevantAnnouncements && relevantAnnouncements.length > 0 && (
        <div className="space-y-4">
           {relevantAnnouncements.slice(0, 5).map(ann => {
             const hasLiked = ann.likes?.includes(currentUser.id) || false;
             const likesCount = ann.likes?.length || 0;
             const repliesCount = ann.replies?.length || 0;

             return (
               <div key={ann.id} className={`rounded-[2rem] p-6 shadow-sm border-r-8 transition-all animate-slide-up bg-white ${
                 ann.priority === 'Critical' ? 'border-red-500' : 
                 ann.priority === 'Urgent' ? 'border-amber-500' :
                 'border-blue-500'
               }`}>
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl shadow-sm ${
                       ann.priority === 'Critical' ? 'bg-red-600 text-white' : 
                       ann.priority === 'Urgent' ? 'bg-amber-600 text-white' :
                       'bg-blue-600 text-white'
                     }`}>
                        <Megaphone size={20} />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg text-gray-900">{ann.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${ann.targetType === 'Specific' ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-indigo-900'}`}>
                              {ann.targetType === 'Specific' ? 'إليك حصراً' : 'للجميع'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(ann.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-gray-600">{ann.content}</p>
                        
                        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                           <button 
                             onClick={() => handleLike(ann.id, hasLiked)}
                             className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${hasLiked ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                           >
                             <Heart size={16} fill={hasLiked ? "currentColor" : "none"} />
                             {likesCount > 0 && likesCount} {hasLiked ? 'أعجبني' : 'إعجاب'}
                           </button>
                           
                           <button 
                             onClick={() => setShowReplies(prev => ({ ...prev, [ann.id]: !prev[ann.id] }))}
                             className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${showReplies[ann.id] ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-500'}`}
                           >
                             <MessageSquare size={16} />
                             {repliesCount > 0 ? `${repliesCount} ردود` : 'إضافة رد'}
                           </button>

                           <div className="flex-1"></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">صادر عن: {ann.createdBy}</span>
                        </div>

                        {showReplies[ann.id] && (
                          <div className="mt-4 space-y-4 animate-fade-in">
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {ann.replies && ann.replies.length > 0 ? ann.replies.map(rep => (
                                <div key={rep.id} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                   <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-indigo-600">{rep.authorName}</span>
                                      <span className="text-[9px] text-gray-400">{new Date(rep.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                   <p className="text-xs text-gray-700 leading-relaxed">{rep.content}</p>
                                </div>
                              )) : (
                                <p className="text-[10px] text-center text-gray-400 italic py-2">لا توجد ردود بعد. كن أول من يعلق!</p>
                              )}
                            </div>
                            
                            <div className="flex gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                               <input 
                                 type="text" 
                                 value={replyInputs[ann.id] || ''} 
                                 onChange={e => setReplyInputs(prev => ({ ...prev, [ann.id]: e.target.value }))}
                                 onKeyDown={e => e.key === 'Enter' && handleReply(ann.id)}
                                 placeholder="اكتب ردك هنا..." 
                                 className="flex-1 bg-transparent text-xs px-3 outline-none"
                               />
                               <button 
                                 onClick={() => handleReply(ann.id)}
                                 className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                               >
                                 <Send size={14} />
                               </button>
                            </div>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             );
           })}
        </div>
      )}

      {/* Rejected Logs for Users */}
      {!isAdmin && visibleRejectedLogs && visibleRejectedLogs.length > 0 && (
        <div className="bg-red-50 border-r-4 border-red-500 p-6 rounded-2xl shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={24} />
              <h3 className="font-black text-lg">سجلات مرفوضة تتطلب تعديل ({visibleRejectedLogs.length})</h3>
            </div>
          </div>
          <div className="space-y-3">
            {visibleRejectedLogs.map(log => {
              const isCommitmentPending = log.approvalStatus === 'CommitmentPending';
              const isCommitting = committingIds.includes(log.id);

              return (
              <div key={log.id} className={`bg-white p-5 rounded-2xl border flex flex-col gap-4 relative group transition-all ${isCommitmentPending ? 'border-amber-200 bg-amber-50/20 opacity-80' : 'border-red-100'}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isCommitmentPending ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {isCommitmentPending ? 'طلب التزام قيد المراجعة' : 'تتطلب مراجعة'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">تاريخ السجل: {new Date(log.logDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed">{log.description}</p>
                    
                    {log.managerNote && (
                      <div className="mt-3 bg-red-50/50 p-3 rounded-xl border border-dashed border-red-200 flex items-start gap-3">
                        <MessageSquare size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-red-600 mb-1 uppercase tracking-tighter">ملاحظة المدير:</p>
                          <p className="text-xs text-red-700 font-medium italic">{log.managerNote}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleCopyDescription(log.description)}
                      className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100"
                      title="نسخ الوصف"
                      disabled={isCommitmentPending}
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleDismissLog(log.id)}
                      className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
                      title="تجاهل مؤقت"
                    >
                      <EyeOff size={16} />
                    </button>
                    
                    {isCommitmentPending ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black border border-amber-200">
                        <Clock size={14} className="animate-pulse" /> بانتظار المدير
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleCommitClick(log.id)}
                        disabled={isCommitting}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isCommitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />} 
                        سيتم الالتزام بها
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard label="إنجاز الفريق اليوم" value={`${stats.todayRate}%`} subLabel="معدل تنفيذ المهام اليومي" icon={<Target className="text-blue-600" />} color="blue" />
            <StatCard label="التزام الأسبوع" value={`${stats.weekRate}%`} subLabel="أداء الفريق خلال 7 أيام" icon={<CalendarCheck className="text-indigo-600" />} color="indigo" />
            <StatCard label="الموظفين النشطين" value={`${stats.activeStaffToday}/${stats.totalStaff}`} subLabel="من سجلوا تقاريرهم اليوم" icon={<Users className="text-emerald-600" />} color="emerald" />
            <StatCard label="طلبات المراجعة" value={stats.pendingApprovalsCount || 0} subLabel="بانتظار الاعتماد" icon={<Clock className="text-amber-600" />} color="amber" />
          </>
        ) : (
          <>
            <StatCard label="إنجازك اليوم" value={`${stats.progressToday}%`} subLabel={`${stats.completedToday} مهمة مكتملة`} icon={<Zap className="text-amber-600" />} color="amber" />
            <StatCard label="إنجازك الأسبوعي" value={`${stats.weekRate}%`} subLabel="خلال آخر 7 أيام" icon={<TrendingUp className="text-indigo-600" />} color="indigo" />
            <StatCard label="تقارير قيد المراجعة" value={stats.myPendingCount} subLabel="بانتظار اعتماد المدير" icon={<Clock className="text-blue-600" />} color="blue" />
            <StatCard label="أيام العمل الموثقة" value={stats.reportingDays} subLabel="بدون الإجازات والخميس والجمعة" icon={<CalendarCheck className="text-emerald-600" />} color="emerald" />
          </>
        )}
      </div>

      {/* Quick Review Box for Admin (Optimized) */}
      {isAdmin && stats.pendingApprovalsList && stats.pendingApprovalsList.length > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 animate-slide-up relative overflow-hidden group/box">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover/box:opacity-[0.06] transition-opacity"><CheckSquare size={160} /></div>
           <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shadow-inner border border-amber-100">
                    <CheckSquare size={26} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">قائمة المراجعة والمصادقة الفورية</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-[0.2em]">تحقق من أحدث السجلات المرفوعة</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-5 py-2.5 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-100 uppercase tracking-widest">{stats.pendingApprovalsCount} مهام معلقة</span>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {stats.pendingApprovalsList.map((log) => {
                const emp = employees.find(e => e.id === log.employeeId);
                const isProcessing = processingLogIds.includes(log.id);
                const isCommitment = log.approvalStatus === 'CommitmentPending';

                return (
                  <div key={log.id} className={`p-6 rounded-[2.2rem] border transition-all group shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 ${isCommitment ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200' : 'bg-gray-50 border-gray-100 hover:border-indigo-200 hover:bg-white'}`}>
                     <div>
                        <div className="flex items-start gap-4 mb-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ${isCommitment ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                              {emp ? emp.name.charAt(0) : <User size={22} />}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">{emp ? emp.name : log.employeeId}</h5>
                              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">{emp?.jobTitle || 'موظف'}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Clock size={10} className="text-gray-300" />
                                <span className="text-[10px] text-gray-400 font-bold">{getTimeAgo(log.logDate)}</span>
                              </div>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-600 leading-relaxed mb-6 line-clamp-3 min-h-[3rem] group-hover:text-gray-800 transition-colors">
                            {log.description}
                        </p>
                     </div>

                     <div className="flex items-center justify-between border-t border-gray-100/60 pt-5 mt-auto">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${isCommitment ? 'bg-amber-500 text-white border-amber-400' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                           {isCommitment ? 'طلب التزام' : 'مراجعة روتينية'}
                        </span>
                        
                        <div className="flex gap-3">
                           <button 
                             onClick={() => handleQuickReject(log.id)}
                             disabled={isProcessing}
                             className="p-2.5 bg-white text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50 active:scale-90"
                             title="رفض"
                           >
                             <X size={18} />
                           </button>
                           <button 
                             onClick={() => handleQuickApprove(log.id)}
                             disabled={isProcessing}
                             className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-90"
                             title="اعتماد"
                           >
                             {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
           
           {stats.pendingApprovalsCount > 6 && (
             <div className="mt-10 text-center border-t border-gray-50 pt-8">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                   <AlertCircle size={14} className="text-amber-400" />
                   يوجد {stats.pendingApprovalsCount - 6} سجلات إضافية بانتظارك في صفحة الإدارة
                </p>
             </div>
           )}
        </div>
      )}

      {/* Main Grid: Pulse & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-8">
            {isAdmin ? (
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col relative overflow-hidden min-h-[400px]">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12"><LayoutGrid size={120} /></div>
                  <h3 className="text-lg font-black text-gray-900 mb-8 tracking-tight">توزيع حالات الفريق اليوم</h3>
                  
                  <div className="space-y-6 flex-1">
                     <DistributionRow label="مكتملة" count={stats.distribution.completed} total={stats.distribution.total} icon={<CircleDot size={18} />} color="bg-emerald-500" textColor="text-emerald-600" />
                     <DistributionRow label="معلقة" count={stats.distribution.pending} total={stats.distribution.total} icon={<Clock size={18} />} color="bg-amber-500" textColor="text-amber-600" />
                     <DistributionRow label="لا تنطبق" count={stats.distribution.na} total={stats.distribution.total} icon={<MinusCircle size={18} />} color="bg-gray-400" textColor="text-gray-500" />
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-50">
                    <button onClick={onRefresh} className="w-full py-3.5 bg-gray-50 text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all border border-indigo-100 text-sm">
                      <RefreshCw size={16} /> تحديث البيانات
                    </button>
                  </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col relative overflow-hidden min-h-[400px]">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12"><Target size={120} /></div>
                  <h3 className="text-lg font-black text-gray-900 mb-8 tracking-tight">اكتمال المهام اليومية</h3>
                  
                  <div className="mb-10 p-10 bg-gradient-to-br from-indigo-50 to-white rounded-[3rem] border border-indigo-100 shadow-inner flex flex-col items-center justify-center text-center">
                    <div className="text-6xl font-black text-indigo-600 mb-3 tracking-tighter">{stats.progressToday}%</div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-4 py-1.5 bg-white rounded-full shadow-sm border border-indigo-50">دقة الإنجاز الفعلي</div>
                  </div>

                  <div className="space-y-6 flex-1">
                     <DistributionRow label="المنفذة" count={stats.distribution.completed} total={stats.distribution.total} icon={<CircleDot size={18} />} color="bg-emerald-500" textColor="text-emerald-600" />
                     <DistributionRow label="المعلقة" count={stats.distribution.pending} total={stats.distribution.total} icon={<Clock size={18} />} color="bg-red-500" textColor="text-red-600" />
                     <DistributionRow label="لا تنطبق" count={stats.distribution.na} total={stats.distribution.total} icon={<MinusCircle size={18} />} color="bg-gray-400" textColor="text-gray-500" />
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-50">
                    <button onClick={onStartLogging} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl text-sm">
                      سجل مهامك الآن <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
            )}
        </div>

        <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <BarChart3 className="text-indigo-600" size={24} />
                {isAdmin ? 'مؤشرات أداء الفريق' : 'سجل التزامك الشخصي'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">تطور الإنجاز خلال الـ 7 أيام الماضية</p>
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

      {/* AI Strategic Insights */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20 group">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000"><Sparkles size={200} /></div>
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
                 <button onClick={generateNewInsights} disabled={loadingInsights} className="flex items-center gap-3 px-8 py-3.5 bg-white text-indigo-950 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-2xl shadow-white/5 active:scale-95 disabled:opacity-50">
                    {loadingInsights ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />} توليد تحليل جديد
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
                         <h4 className="text-amber-400 font-black mb-6 text-xs uppercase tracking-[0.3em] flex items-center gap-2"><ShieldCheck size={18} /> رؤية الأداء العام</h4>
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
                      <h4 className="text-indigo-200 font-black mb-8 flex items-center gap-2 text-sm uppercase tracking-widest"><Zap size={20} className="text-amber-400" /> مهام مقترح أتمتتها</h4>
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
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6"><LayoutGrid size={32} className="text-indigo-400" /></div>
                   <p className="text-indigo-200 font-bold mb-8 text-lg">بانتظار البيانات لتوليد الرؤى الاستراتيجية للفريق</p>
                   <button onClick={generateNewInsights} className="px-10 py-4 bg-white text-indigo-950 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl">تحليل السجلات الآن</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

const DistributionRow = ({ label, count, total, icon, color, textColor }: { label: string, count: number, total: number, icon: React.ReactNode, color: string, textColor: string }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${textColor}`}>{icon}</div>
          <span className="text-xs font-bold text-gray-700">{label}</span>
        </div>
        <span className={`text-[10px] font-black ${textColor}`}>{count} مهام ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

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
        <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform shadow-inner`}>{React.cloneElement(icon as React.ReactElement, { size: 24 })}</div>
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default TaskDashboard;

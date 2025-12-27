
import React, { useState, useMemo } from 'react';
import { Employee, TaskLog, Task, Assignment } from '../types';
import { Printer, Calendar, Briefcase, FileSpreadsheet, TrendingUp, Users, CheckCircle, Info, Target, Award, Clock, Star, Zap, Activity } from 'lucide-react';

interface AnalyticsReportsProps {
  employees: Employee[];
  logs: TaskLog[];
  tasks: Task[]; 
  assignments: Assignment[]; 
}

export default function AnalyticsReports({ employees, logs, tasks = [], assignments = [] }: AnalyticsReportsProps) {
  const [viewMode, setViewMode] = useState<'individual' | 'comparative'>('individual');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [dateRangeType, setDateRangeType] = useState<'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-CA');
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // --- Helpers for Normalization ---
  const isLeaveStatus = (status: string) => ['Leave', 'إجازة', 'عطلة', 'Weekly'].includes(status);
  const isCompletedStatus = (status: string) => ['Completed', 'منفذة'].includes(status);
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 4 || day === 5; // الخميس والجمعة
  };

  const { startDate, endDate } = useMemo(() => {
    let start = new Date();
    let end = new Date();
    if (dateRangeType === 'custom') {
        const [sY, sM, sD] = customStartDate.split('-').map(Number);
        start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
        const [eY, eM, eD] = customEndDate.split('-').map(Number);
        end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
    } else if (dateRangeType === 'week') {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
    return { startDate: start, endDate: end };
  }, [dateRangeType, customStartDate, customEndDate]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (!l.logDate) return false;
      const logDate = new Date(l.logDate);
      if (isNaN(logDate.getTime())) return false;
      const inRange = logDate.getTime() >= startDate.getTime() && logDate.getTime() <= endDate.getTime();
      return inRange && (l.approvalStatus === 'Approved' || l.approvalStatus === 'PendingApproval' || !l.approvalStatus);
    });
  }, [logs, startDate, endDate]);

  const empLogs = useMemo(() => {
    if (!selectedEmpId) return [];
    return filteredLogs.filter(l => l.employeeId === selectedEmpId)
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
  }, [filteredLogs, selectedEmpId]);

  // احتساب الإحصائيات مع مراعاة الخميس والجمعة تلقائياً
  const adherenceStats = useMemo(() => {
    let grossDays = 0;
    let presentDaysCount = 0; 
    let weekendHolidays = 0;
    let manualLeaves = 0; 

    const logsByDate = new Map<string, TaskLog[]>();
    empLogs.forEach(l => {
      const dKey = new Date(l.logDate).toLocaleDateString('en-CA');
      if (!logsByDate.has(dKey)) logsByDate.set(dKey, []);
      logsByDate.get(dKey)?.push(l);
    });

    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const effectiveEnd = new Date(endDate > new Date() ? new Date() : endDate);
    effectiveEnd.setHours(23, 59, 59, 999);

    while (cursor.getTime() <= effectiveEnd.getTime()) {
       const dateStr = cursor.toLocaleDateString('en-CA');
       const dayLogs = logsByDate.get(dateStr) || [];
       const isManualLeave = dayLogs.some(l => isLeaveStatus(l.status));
       const weekend = isWeekend(cursor);

       grossDays++;
       if (weekend) {
           weekendHolidays++;
       } else if (isManualLeave) {
           manualLeaves++;
       } else if (dayLogs.length > 0) {
           presentDaysCount++;
       }
       cursor.setDate(cursor.getDate() + 1);
    }

    const totalLeaves = weekendHolidays + manualLeaves;
    const netWorkDays = Math.max(0, grossDays - totalLeaves);
    const attendanceRate = netWorkDays > 0 ? Math.round((presentDaysCount / netWorkDays) * 100) : 0;
    
    return { grossDays, netWorkDays, presentDays: presentDaysCount, totalLeaves, attendanceRate, manualLeaves, weekendHolidays };
  }, [startDate, endDate, empLogs]);

  const taskBreakdown = useMemo(() => {
    if (!selectedEmpId) return [];
    const assignedTaskIds = assignments.filter(a => a.employeeId === selectedEmpId).map(a => a.taskId);
    const routineTasks = tasks.filter(t => assignedTaskIds.includes(t.id));
    
    return routineTasks.map(task => {
        const relevantLogs = empLogs.filter(l => l.taskId === task.id);
        const completed = relevantLogs.filter(l => isCompletedStatus(l.status)).length;
        const pending = relevantLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
        const rate = adherenceStats.presentDays > 0 ? Math.round((completed / adherenceStats.presentDays) * 100) : 0;

        return { 
          taskId: task.id, 
          desc: task.description, 
          completed, 
          pending, 
          rate,
          category: task.category
        };
    }).sort((a, b) => b.rate - a.rate);
  }, [empLogs, assignments, tasks, selectedEmpId, adherenceStats.presentDays]);

  const comparisonData = useMemo(() => {
    return employees.map(emp => {
      const empOwnLogs = filteredLogs.filter(l => l.employeeId === emp.id && !isLeaveStatus(l.status));
      const uniqueDays = new Set(empOwnLogs.map(l => new Date(l.logDate).toLocaleDateString('en-CA'))).size;
      const completed = empOwnLogs.filter(l => isCompletedStatus(l.status)).length;
      const total = empOwnLogs.length;
      const rate = total > 0 ? (completed / total) * 100 : 0;
      return { id: emp.id, name: emp.name, completed, rate, daysPresent: uniqueDays };
    }).sort((a, b) => b.rate - a.rate);
  }, [employees, filteredLogs]);

  const exportToCSV = () => {
    const BOM = "\uFEFF";
    let csvContent = BOM;
    if (viewMode === 'individual' && selectedEmployee) {
        csvContent += "التاريخ,الموظف,المهمة,الحالة\n";
        empLogs.forEach(log => {
          csvContent += `"${new Date(log.logDate).toLocaleDateString('ar-EG')}","${selectedEmployee.name}","${log.description}","${log.status}"\n`;
        });
    } else {
        csvContent += "الترتيب,الموظف,الأيام,المنفذة,النسبة\n";
        comparisonData.forEach((d, idx) => {
            csvContent += `"${idx + 1}","${d.name}","${d.daysPresent}","${d.completed}","${d.rate.toFixed(1)}%"\n`;
        });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Performance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0 print:p-0">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-6 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
            <div className="flex bg-gray-100 p-1.5 rounded-xl">
                <button onClick={() => setViewMode('individual')} className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${viewMode === 'individual' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase size={18} /> تقرير فردي</button>
                <button onClick={() => setViewMode('comparative')} className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${viewMode === 'comparative' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><TrendingUp size={18} /> مقارنة الأداء</button>
            </div>
            <div className="flex gap-3">
                <button onClick={exportToCSV} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-100"><FileSpreadsheet size={18} /> تصدير CSV</button>
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-100"><Printer size={18} /> طباعة</button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
             {viewMode === 'individual' && (
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">الموظف</label>
                    <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl block pr-4 pl-4 py-3.5 appearance-none cursor-pointer">
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
             )}
             <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">الفترة</label>
                <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-200">
                    <button onClick={() => setDateRangeType('week')} className={`flex-1 px-3 py-2 text-xs font-black rounded-lg ${dateRangeType === 'week' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>أسبوع</button>
                    <button onClick={() => setDateRangeType('month')} className={`flex-1 px-3 py-2 text-xs font-black rounded-lg ${dateRangeType === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>شهر</button>
                    <button onClick={() => setDateRangeType('custom')} className={`flex-1 px-3 py-2 text-xs font-black rounded-lg ${dateRangeType === 'custom' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>مخصص</button>
                </div>
             </div>
             {dateRangeType === 'custom' && (
                <>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-3.5 border border-gray-200 rounded-xl text-sm font-bold bg-gray-50" />
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-3.5 border border-gray-200 rounded-xl text-sm font-bold bg-gray-50" />
                </>
             )}
        </div>
      </div>

      {/* Main Report Body */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-200 print:shadow-none print:border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-bl-full opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="border-b-2 border-gray-100 pb-10 mb-10 flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
           <div className="flex items-center gap-6">
             <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">ن</div>
             <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{viewMode === 'individual' ? 'تقرير التقييم الفردي الدقيق' : 'تحليل الأداء التنافسي'}</h2>
                <p className="text-gray-500 font-bold mt-2 flex items-center gap-2"><Calendar size={16} /> من {startDate.toLocaleDateString('ar-EG')} إلى {endDate.toLocaleDateString('ar-EG')}</p>
             </div>
           </div>
           {viewMode === 'individual' && selectedEmployee && (
            <div className="bg-gray-50 px-8 py-5 rounded-[2rem] border border-gray-100 flex items-center gap-6 shadow-inner">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border border-indigo-100 shadow-sm"><Users size={28} className="text-indigo-600" /></div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedEmployee.name}</h3>
                    <p className="text-indigo-500 font-black text-xs mt-1 uppercase tracking-widest">{selectedEmployee.jobTitle}</p>
                </div>
            </div>
           )}
        </div>

        {viewMode === 'individual' ? (
            <div className="space-y-12 relative z-10">
                {/* Statistics Grid */}
                <div>
                    <div className="flex items-center gap-3 mb-6"><div className="w-2 h-8 bg-blue-500 rounded-full"></div><h4 className="text-xl font-black text-gray-900">مؤشرات الحضور والالتزام</h4></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <AnalyticCard label="أيام العمل الفعلية" value={adherenceStats.netWorkDays} icon={<Briefcase size={22}/>} color="blue" />
                        <AnalyticCard label="التقارير المرفوعة" value={adherenceStats.presentDays} icon={<Activity size={22}/>} color="green" />
                        <AnalyticCard label="إجمالي الإجازات" value={adherenceStats.totalLeaves} icon={<Clock size={22}/>} color="orange" tooltip="تشمل الخميس والجمعة تلقائياً" />
                        <StatCardPercentage label="نسبة الالتزام" value={adherenceStats.attendanceRate} />
                    </div>
                </div>

                {/* Task Analysis */}
                <div>
                    <div className="flex items-center gap-3 mb-6"><div className="w-2 h-8 bg-indigo-500 rounded-full"></div><h4 className="text-xl font-black text-gray-900">تحليل كفاءة تنفيذ المهام الروتينية</h4></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {taskBreakdown.length > 0 ? taskBreakdown.map((item, idx) => (
                            <TaskPerformanceCard key={idx} item={item} />
                        )) : <div className="col-span-full py-10 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">لا توجد مهام روتينية معينة</div>}
                    </div>
                </div>

                {/* Evaluative Vision Section */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                        <Award size={200} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                            <Target size={48} className="text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-white mb-4">رؤية تقييمية للمدير</h4>
                            <p className="text-indigo-100 text-lg leading-relaxed font-medium italic">
                                {adherenceStats.attendanceRate >= 95 && taskBreakdown.every(t => t.rate >= 90) ? (
                                    "يتمتع الموظف بمعدل التزام استثنائي مع دقة متناهية في تنفيذ المهام الروتينية. أداؤه يعكس انضباطاً ذاتياً عالياً وقدرة على إدارة الوقت بفعالية قصوى."
                                ) : adherenceStats.attendanceRate < 70 ? (
                                    "يوجد تراجع ملحوظ في معدل الالتزام برفع التقارير اليومية؛ هذا الخلل يؤثر على دقة التقييم الإجمالي. يوصى بمراجعة الموظف لمعرفة أسباب عدم الانتظام."
                                ) : (
                                    "الأداء العام للموظف مستقر ومقبول، ولكن توجد بعض المهام الروتينية التي تظهر نسبة إنجاز منخفضة (أقل من 80%). يوصى بتركيز التوجيه على تحسين جودة هذه المهام المحددة."
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-12 relative z-10">
                <div className="flex items-center gap-3 mb-2"><div className="w-2 h-8 bg-indigo-500 rounded-full"></div><h4 className="text-xl font-black text-gray-900">لوحة الصدارة والتميز</h4></div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-4 space-y-4">
                        {comparisonData.slice(0, 5).map((data, idx) => (
                            <div key={data.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-6 group hover:border-indigo-200 transition-all">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-xl shadow-inner ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                                <div className="flex-1">
                                    <h5 className="font-black text-gray-800 text-lg group-hover:text-indigo-600 transition-colors">{data.name}</h5>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mt-1">الكفاءة: {data.rate.toFixed(1)}%</p>
                                </div>
                                {idx === 0 && <Star className="text-amber-500 animate-pulse" fill="currentColor" size={24} />}
                            </div>
                        ))}
                    </div>
                    <div className="xl:col-span-8 bg-gray-50 rounded-[3rem] p-8 border border-gray-100 shadow-inner overflow-hidden">
                        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-900 text-white font-black">
                                    <tr><th className="px-6 py-5">الموظف</th><th className="px-6 py-5 text-center">أيام التواجد</th><th className="px-6 py-5 text-center">المنفذة</th><th className="px-6 py-5 text-center">نسبة الكفاءة</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {comparisonData.map((data) => (
                                        <tr key={data.id} className="hover:bg-indigo-50/50 transition-colors">
                                            <td className="px-6 py-5 font-black text-gray-800">{data.name}</td>
                                            <td className="px-6 py-5 text-center font-bold text-blue-600">{data.daysPresent}</td>
                                            <td className="px-6 py-5 text-center font-bold text-emerald-600">{data.completed}</td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-xl font-black text-xs">{data.rate.toFixed(1)}%</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="hidden print:block mt-20 pt-10 border-t-2 border-dashed border-gray-200 text-center">
            <p className="text-sm font-black text-gray-900 mb-1">نظام مُيسّر المهام - تقرير تقييمي آلي معتمد</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">تاريخ الاستخراج {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components (Carefully defined to avoid SyntaxErrors) ---

const AnalyticCard: React.FC<{ label: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'green' | 'orange', tooltip?: string }> = ({ label, value, icon, color, tooltip }) => {
    const config = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
        green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' }
    }[color];

    return (
        <div className={`${config.bg} p-6 rounded-[2rem] border ${config.border} flex flex-col items-center justify-center text-center transition-transform hover:scale-105 relative group`}>
            <div className={`mb-3 p-2.5 rounded-2xl bg-white shadow-sm ${config.text}`}>{icon}</div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 opacity-80">{label}</p>
            <p className={`text-3xl font-black ${config.text.replace('600', '800')}`}>{value}</p>
            {tooltip && (
                <div className="absolute -top-2 bg-gray-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {tooltip}
                </div>
            )}
        </div>
    );
};

const StatCardPercentage: React.FC<{ label: string, value: number }> = ({ label, value }) => {
    const colorClass = value >= 90 ? 'bg-emerald-500 shadow-emerald-100' : 'bg-amber-500 shadow-amber-100';
    return (
        <div className={`${colorClass} p-6 rounded-[2rem] text-white shadow-xl flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
            <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-4xl font-black">{value}%</p>
        </div>
    );
};

const TaskPerformanceCard: React.FC<{ item: any }> = ({ item }) => {
    const rate = item.rate;
    const badge = rate >= 95 ? { l: 'ممتاز', c: 'bg-emerald-100 text-emerald-700' } : 
                  rate >= 80 ? { l: 'جيد جداً', c: 'bg-blue-100 text-blue-700' } :
                  rate >= 60 ? { l: 'جيد', c: 'bg-amber-100 text-amber-700' } : { l: 'ضعيف', c: 'bg-red-100 text-red-700' };

    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg uppercase tracking-wider">{item.category}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${badge.c}`}>{badge.l}</span>
                    </div>
                    <h5 className="font-black text-gray-800 text-lg leading-snug group-hover:text-indigo-600 transition-colors">{item.desc}</h5>
                </div>
                <div className="text-right ml-4"><span className="text-4xl font-black text-gray-900">{rate}%</span></div>
            </div>
            <div className="space-y-4">
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div className={`h-full transition-all duration-1000 ${rate >= 90 ? 'bg-emerald-500' : rate >= 60 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }}></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 tracking-tighter">مرات التنفيذ</p><p className="text-lg font-black text-emerald-800 leading-none">{item.completed}</p></div>
                    <div className="text-center p-3 bg-red-50 rounded-2xl border border-red-100"><p className="text-[9px] font-black text-red-600 uppercase mb-0.5 tracking-tighter">مرات التعثر</p><p className="text-lg font-black text-red-800 leading-none">{item.pending}</p></div>
                </div>
            </div>
        </div>
    );
};

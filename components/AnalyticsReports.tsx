
import React, { useState, useMemo } from 'react';
import { Employee, TaskLog, Task, Assignment } from '../types';
import { Printer, Calendar, Filter, Download, Briefcase, FileSpreadsheet, BarChart2, PieChart, TrendingUp, Users, Check, X, AlertCircle, Clock } from 'lucide-react';

interface AnalyticsReportsProps {
  employees: Employee[];
  logs: TaskLog[];
  tasks: Task[]; 
  assignments: Assignment[]; 
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ employees, logs, tasks = [], assignments = [] }) => {
  // View State
  const [viewMode, setViewMode] = useState<'individual' | 'comparative'>('individual');
  
  // Individual Filter State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  
  // Comparative Filter State
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  
  // Date Filter State
  const [dateRangeType, setDateRangeType] = useState<'week' | 'month' | 'custom'>('month');
  
  // Initialize custom dates with local timezone safety
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  });

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // --- Dates Calculation (Robust Local Time) ---
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
    } else if (dateRangeType === 'month') {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    return { startDate: start, endDate: end };
  }, [dateRangeType, customStartDate, customEndDate]);

  // --- Filter Logs (Robust) ---
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (!l.logDate) return false;
      const logDate = new Date(l.logDate);
      if (isNaN(logDate.getTime())) return false;
      
      const inRange = logDate.getTime() >= startDate.getTime() && logDate.getTime() <= endDate.getTime();
      const isEligible = l.approvalStatus === 'Approved' || l.approvalStatus === 'PendingApproval' || !l.approvalStatus;
      
      return inRange && isEligible;
    });
  }, [logs, startDate, endDate]);

  // --- Individual Data ---
  const empLogs = useMemo(() => {
    if (!selectedEmpId) return [];
    return filteredLogs.filter(l => l.employeeId === selectedEmpId)
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
  }, [filteredLogs, selectedEmpId]);

  // --- Comparative Data ---
  const comparisonData = useMemo(() => {
    let targetEmployees = employees;
    if (selectedComparisonIds.length > 0) {
        targetEmployees = employees.filter(e => selectedComparisonIds.includes(e.id));
    }

    return targetEmployees.map(emp => {
      const empOwnLogs = filteredLogs.filter(l => l.employeeId === emp.id && l.status !== 'Leave' && l.status !== 'إجازة');
      const uniqueDays = new Set(empOwnLogs.map(l => new Date(l.logDate).toLocaleDateString('en-CA'))).size;
      const total = empOwnLogs.length;
      const completed = empOwnLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
      const rate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        id: emp.id,
        name: emp.name,
        total,
        completed,
        rate,
        daysPresent: uniqueDays 
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [employees, filteredLogs, selectedComparisonIds]);

  // --- Advanced Adherence Logic (Individual) ---
  const adherenceStats = useMemo(() => {
    let grossWorkingDays = 0;
    let presentDays = 0; 
    let weeklyHolidays = 0; 
    let officialLeaves = 0; 

    const logsByDate = new Map<string, TaskLog[]>();
    empLogs.forEach(l => {
      const dKey = new Date(l.logDate).toLocaleDateString('en-CA');
      if (!logsByDate.has(dKey)) logsByDate.set(dKey, []);
      logsByDate.get(dKey)?.push(l);
    });

    const cursor = new Date(startDate);
    cursor.setHours(0,0,0,0);
    const endLoop = new Date(endDate);
    endLoop.setHours(23,59,59,999);
    const today = new Date();
    today.setHours(23,59,59,999);
    const effectiveEnd = endLoop > today ? today : endLoop;

    while (cursor.getTime() <= effectiveEnd.getTime()) {
       const dayOfWeek = cursor.getDay(); // 0=Sun, ..., 4=Thu, 5=Fri
       const dateStr = cursor.toLocaleDateString('en-CA');
       const dayLogs = logsByDate.get(dateStr) || [];
       const hasLog = dayLogs.length > 0;
       const isLeave = dayLogs.some(l => l.status === 'Leave' || l.status === 'إجازة' || l.status === 'عطلة');
       const isWeekend = dayOfWeek === 4 || dayOfWeek === 5;

       if (isWeekend) {
           weeklyHolidays++;
       } else {
           grossWorkingDays++;
           if (hasLog) {
               if (isLeave) officialLeaves++;
               else presentDays++;
           }
       }
       cursor.setDate(cursor.getDate() + 1);
    }

    const netExpectedWorkDays = Math.max(0, grossWorkingDays - officialLeaves);
    const attendanceRate = netExpectedWorkDays > 0 
        ? Math.round((presentDays / netExpectedWorkDays) * 100) 
        : 0;

    return { 
        grossWorkingDays, 
        netExpectedWorkDays, 
        presentDays, 
        weeklyHolidays, 
        officialLeaves,
        attendanceRate
    };
  }, [startDate, endDate, empLogs]);

  // --- Task Performance Breakdown (Routine Only & Database Sequence) ---
  const taskBreakdown = useMemo(() => {
    if (!selectedEmpId) return [];

    // 1. Get assigned tasks for the individual
    const assignedTaskIds = assignments
        .filter(a => a.employeeId === selectedEmpId)
        .map(a => a.taskId);
    
    // 2. Map to actual task objects and ensure they exist in main tasks table
    const routineTasks = tasks.filter(t => assignedTaskIds.includes(t.id));

    // 3. Process each routine task in its database sequence (ascending)
    return routineTasks.map(task => {
        const relevantLogs = empLogs.filter(l => l.taskId === task.id);
        const totalLogged = relevantLogs.length;
        const completed = relevantLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
        const pending = relevantLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
        const na = relevantLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;

        return {
            taskId: task.id,
            desc: task.description,
            isAssigned: true,
            totalLogged,
            completed,
            pending,
            na
        };
    });
  }, [empLogs, assignments, tasks, selectedEmpId]);

  const totals = useMemo(() => {
    const executed = empLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
    const notExecuted = empLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
    const na = empLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;
    const total = executed + notExecuted + na;
    return { executed, notExecuted, na, total };
  }, [empLogs]);

  const toggleComparisonId = (id: string) => {
    setSelectedComparisonIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };
  
  const selectAllComparison = () => {
    if (selectedComparisonIds.length === employees.length) setSelectedComparisonIds([]);
    else setSelectedComparisonIds(employees.map(e => e.id));
  };

  const renderDonutChart = () => {
    if (totals.total === 0) return null;
    const circumference = 2 * Math.PI * 40;
    const pExec = totals.executed / totals.total;
    const pPend = totals.notExecuted / totals.total;
    const pNA = totals.na / totals.total;
    const strokeExec = pExec * circumference;
    const strokePend = pPend * circumference;
    const strokeNA = pNA * circumference;

    return (
      <div className="flex flex-col items-center">
        <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90">
          {pExec > 0 && <circle cx="50" cy="50" r="40" stroke="#22c55e" strokeWidth="15" fill="transparent" strokeDasharray={`${strokeExec} ${circumference}`} strokeDashoffset="0" />}
          {pPend > 0 && <circle cx="50" cy="50" r="40" stroke="#ef4444" strokeWidth="15" fill="transparent" strokeDasharray={`${strokePend} ${circumference}`} strokeDashoffset={`-${strokeExec}`} />}
          {pNA > 0 && <circle cx="50" cy="50" r="40" stroke="#9ca3af" strokeWidth="15" fill="transparent" strokeDasharray={`${strokeNA} ${circumference}`} strokeDashoffset={`-${strokeExec + strokePend}`} />}
        </svg>
        <div className="mt-4 flex gap-4 text-xs font-bold text-gray-600">
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> منفذة</div>
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> غير منفذة</div>
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-400 rounded-full"></span> لا تنطبق</div>
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    if (viewMode === 'individual' && !selectedEmployee) return;
    const BOM = "\uFEFF";
    let csvContent = BOM;

    if (viewMode === 'individual' && selectedEmployee) {
        csvContent += "التاريخ,اسم الموظف,نوع السجل,وصف المهمة,الحالة,المصادقة\n";
        empLogs.forEach(log => {
          const date = new Date(log.logDate).toLocaleDateString('ar-EG');
          const type = log.taskType === 'Daily' ? 'روتيني' : 'إضافي';
          let status = 'غير محدد';
          if (log.status === 'Completed' || log.status === 'منفذة') status = 'منفذة';
          else if (log.status === 'Pending' || log.status === 'غير منفذة') status = 'غير منفذة';
          else if (log.status === 'NotApplicable' || log.status === 'لا تنطبق') status = 'لا تنطبق';
          else if (log.status === 'Leave' || log.status === 'إجازة') status = 'إجازة';
          else status = String(log.status); 
          
          const approved = log.approvalStatus === 'Approved' ? 'نعم' : 'لا (معلق)';
          csvContent += `"${date}","${selectedEmployee.name}","${type}","${log.description.replace(/"/g, '""')}","${status}","${approved}"\n`;
        });
        downloadCSV(csvContent, `Report_${selectedEmployee.name}.csv`);
    } else {
        csvContent += "الترتيب,اسم الموظف,التقارير المسجلة,إجمالي المهام,المهام المنفذة,نسبة الإنجاز\n";
        comparisonData.forEach((d, idx) => {
            csvContent += `"${idx + 1}","${d.name}","${d.daysPresent}","${d.total}","${d.completed}","${d.rate.toFixed(1)}%"\n`;
        });
        downloadCSV(csvContent, `Comparison_Report.csv`);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0 print:p-0">
      
      {/* --- Controls Header --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('individual')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'individual' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase size={16} /> تقرير فردي</button>
                <button onClick={() => setViewMode('comparative')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'comparative' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><TrendingUp size={16} /> مقارنة الأداء</button>
            </div>
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors font-bold"><FileSpreadsheet size={16} /> تصدير Excel</button>
                <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors font-bold"><Printer size={16} /> طباعة</button>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
             {viewMode === 'individual' && (
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">الموظف</label>
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-gray-400" />
                        <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 min-w-[220px]">
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                </div>
             )}

             {viewMode === 'comparative' && (
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">نطاق المقارنة</label>
                    <div className="relative group">
                        <button className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-300 rounded-lg p-2.5 min-w-[220px] text-sm">
                            <span>{selectedComparisonIds.length > 0 ? `تم تحديد ${selectedComparisonIds.length} موظف` : 'جميع الموظفين'}</span>
                            <Filter size={16} className="text-gray-400"/>
                        </button>
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block p-2 max-h-60 overflow-y-auto">
                            <button onClick={selectAllComparison} className="text-xs text-indigo-600 font-bold mb-2 hover:underline block w-full text-right px-1">{selectedComparisonIds.length === employees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</button>
                            {employees.map(emp => (
                                <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedComparisonIds.includes(emp.id)} onChange={() => toggleComparisonId(emp.id)} className="rounded text-indigo-600" />
                                    <span className="text-sm text-gray-700 truncate">{emp.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
             )}

             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">الفترة الزمنية</label>
                   <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setDateRangeType('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'week' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>أسبوع</button>
                        <button onClick={() => setDateRangeType('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>شهر</button>
                        <button onClick={() => setDateRangeType('custom')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'custom' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>مخصص</button>
                   </div>
                </div>
                {dateRangeType === 'custom' && (
                    <div className="flex gap-2 items-center animate-fade-in">
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* --- CONTENT AREA (Printable) --- */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 print:w-full print:rounded-none">
        
        <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-start">
           <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">ن</div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewMode === 'individual' ? 'تقرير الأداء الفردي' : 'تقرير مقارنة الأداء'}</h2>
                <p className="text-gray-500 mt-1 text-sm">نظام مُيسّر المهام - التحليلات المتقدمة</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-1 rounded w-fit">
                    <Calendar size={12} /> {startDate.toLocaleDateString('ar-EG')} - {endDate.toLocaleDateString('ar-EG')}
                </div>
             </div>
           </div>
           {viewMode === 'individual' && (
            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-xl font-bold text-indigo-700">{selectedEmployee?.name}</h3>
                <p className="text-gray-600 font-medium text-sm">{selectedEmployee?.jobTitle}</p>
            </div>
           )}
        </div>

        {/* === INDIVIDUAL REPORT === */}
        {viewMode === 'individual' && (
            <div className="space-y-8">
                <h4 className="font-bold text-gray-800 border-r-4 border-blue-500 pr-3 text-lg">تحليل الالتزام بالتقارير</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold mb-1">التقارير المتوقعة</p>
                        <p className="text-2xl font-bold text-blue-800">{adherenceStats.netExpectedWorkDays}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-xs text-green-600 font-bold mb-1">التقارير المسجلة</p>
                        <p className="text-2xl font-bold text-green-800">{adherenceStats.presentDays}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${adherenceStats.attendanceRate >= 90 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : adherenceStats.attendanceRate >= 75 ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        <p className="text-xs font-bold mb-1">نسبة الالتزام</p>
                        <p className="text-2xl font-bold">{adherenceStats.attendanceRate}%</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <p className="text-xs text-orange-600 font-bold mb-1">إجازات وعطلات</p>
                        <p className="text-2xl font-bold text-orange-800">{adherenceStats.weeklyHolidays + adherenceStats.officialLeaves}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 avoid-break">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col items-center justify-center">
                        <h5 className="font-bold text-gray-700 mb-4 text-sm">جودة التنفيذ الكلية</h5>
                        {totals.total > 0 ? renderDonutChart() : <p className="text-gray-400 text-sm">لا توجد بيانات</p>}
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-bold text-gray-800 mb-4 border-r-4 border-indigo-500 pr-3 text-lg">تحليل المهام الروتينية (تصاعدياً)</h4>
                        {taskBreakdown.length > 0 ? taskBreakdown.map((item, idx) => {
                            const expectedCoverage = adherenceStats.netExpectedWorkDays > 0 
                                ? Math.round((item.completed / adherenceStats.netExpectedWorkDays) * 100) 
                                : 0;
                            
                            return (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm avoid-break">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-gray-800 text-sm max-w-[70%]">{item.desc}</h5>
                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                        منفذة: <b>{item.completed}</b> / {adherenceStats.netExpectedWorkDays}
                                    </span>
                                </div>
                                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                    <div 
                                        className={`h-full absolute top-0 right-0 rounded-full ${expectedCoverage >= 90 ? 'bg-green-500' : expectedCoverage >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: `${Math.min(expectedCoverage, 100)}%` }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-700">{expectedCoverage}% التزام</div>
                                </div>
                            </div>
                            )
                        }) : <div className="text-center py-6 text-gray-400 border border-dashed rounded-lg">لا توجد مهام روتينية معينة</div>}
                    </div>
                </div>
            </div>
        )}
        
        {/* === COMPARATIVE REPORT === */}
        {viewMode === 'comparative' && (
            <div className="space-y-10">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                    <TrendingUp size={20} />
                    <p>يعرض هذا التقرير مقارنة شاملة لأداء الفريق بناءً على الالتزام بتسجيل المهام وجودة التنفيذ.</p>
                </div>

                <div>
                    <h4 className="font-bold text-gray-800 mb-6 border-r-4 border-green-500 pr-3 text-lg">معدلات إنجاز الفريق</h4>
                    <div className="space-y-4">
                        {comparisonData.length > 0 ? comparisonData.map((data, idx) => (
                            <div key={data.id} className="avoid-break">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span className="text-gray-700 flex items-center gap-2">#{idx + 1} {data.name}</span>
                                    <span className="text-gray-900">{data.rate.toFixed(1)}%</span>
                                </div>
                                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${data.rate >= 90 ? 'bg-green-500' : data.rate >= 70 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${data.rate}%` }}></div>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 py-8">لا توجد بيانات للمقارنة</div>}
                    </div>
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-xl">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">الموظف</th>
                                <th className="px-4 py-3 text-center">التقارير</th>
                                <th className="px-4 py-3 text-center">المهام</th>
                                <th className="px-4 py-3 text-center">المنفذة</th>
                                <th className="px-4 py-3 text-center">النسبة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {comparisonData.map((data) => (
                                <tr key={data.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-bold">{data.name}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{data.daysPresent}</td>
                                    <td className="px-4 py-3 text-center">{data.total}</td>
                                    <td className="px-4 py-3 text-center text-green-700">{data.completed}</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold">{data.rate.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
           <div className="text-center text-xs text-gray-500">تم توليد هذا التقرير آلياً عبر نظام مُيسّر المهام - {new Date().toLocaleString('ar-EG')}</div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsReports;

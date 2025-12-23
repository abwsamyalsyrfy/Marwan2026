
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
        // Parse YYYY-MM-DD to Local Midnight
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
      
      // Check date range
      const inRange = logDate.getTime() >= startDate.getTime() && logDate.getTime() <= endDate.getTime();
      
      // Check Status: Include Approved, Pending, or Legacy (undefined)
      // Exclude explicitly Rejected
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
      // Filter for this employee
      const empOwnLogs = filteredLogs.filter(l => l.employeeId === emp.id && l.status !== 'Leave');
      
      // Calculate Reports Submitted (Unique Local Days)
      const uniqueDays = new Set(empOwnLogs.map(l => new Date(l.logDate).toLocaleDateString('en-CA'))).size;

      const total = empOwnLogs.length;
      // Support English or Arabic status for robustness
      const completed = empOwnLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
      const rate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        id: emp.id,
        name: emp.name,
        total,
        completed,
        rate,
        daysPresent: uniqueDays // Labelled "Reports Recorded" in UI
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [employees, filteredLogs, selectedComparisonIds]);

  // --- Advanced Adherence & Holiday Logic (Individual) ---
  const adherenceStats = useMemo(() => {
    let grossWorkingDays = 0; // Total weekdays in range
    let presentDays = 0; // Days with logs (excluding leaves)
    let weeklyHolidays = 0; // Thu/Fri
    let officialLeaves = 0; // Logged as Leave

    // Map logs by YYYY-MM-DD
    const logsByDate = new Map<string, TaskLog[]>();
    empLogs.forEach(l => {
      const dKey = new Date(l.logDate).toLocaleDateString('en-CA');
      if (!logsByDate.has(dKey)) logsByDate.set(dKey, []);
      logsByDate.get(dKey)?.push(l);
    });

    // Iterate day by day using local time to respect weekends
    const cursor = new Date(startDate);
    // Ensure cursor starts at midnight local
    cursor.setHours(0,0,0,0);
    
    const endLoop = new Date(endDate);
    endLoop.setHours(23,59,59,999);
    
    // Cap at today to avoid calculating future adherence drop
    const today = new Date();
    today.setHours(23,59,59,999);
    const effectiveEnd = endLoop > today ? today : endLoop;

    while (cursor.getTime() <= effectiveEnd.getTime()) {
       const dayOfWeek = cursor.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri
       const dateStr = cursor.toLocaleDateString('en-CA');
       
       const dayLogs = logsByDate.get(dateStr) || [];
       const hasLog = dayLogs.length > 0;
       const isLeave = dayLogs.some(l => l.status === 'Leave' || l.status === 'إجازة' || l.status === 'عطلة');

       // Weekend is Thu (4) & Fri (5)
       const isWeekend = dayOfWeek === 4 || dayOfWeek === 5;

       if (isWeekend) {
           weeklyHolidays++;
       } else {
           grossWorkingDays++;
           if (hasLog) {
               if (isLeave) officialLeaves++;
               else presentDays++;
           } else {
               // Absent / No Report
           }
       }
       
       // Move to next day
       cursor.setDate(cursor.getDate() + 1);
    }

    // Net Expected Days = Weekdays - Official Leaves Taken
    const netExpectedWorkDays = Math.max(0, grossWorkingDays - officialLeaves);
    // Adherence Rate Calculation
    const attendanceRate = netExpectedWorkDays > 0 
        ? Math.round((presentDays / netExpectedWorkDays) * 100) 
        : 0;

    return { 
        grossWorkingDays, // All weekdays
        netExpectedWorkDays, // Weekdays minus leaves
        presentDays, 
        weeklyHolidays, 
        officialLeaves,
        attendanceRate
    };
  }, [startDate, endDate, empLogs]);

  // --- Task Performance Breakdown ---
  const taskBreakdown = useMemo(() => {
    if (!selectedEmpId) return [];

    // 1. Assigned Tasks
    const assignedTaskIds = assignments
        .filter(a => a.employeeId === selectedEmpId)
        .map(a => a.taskId);
    
    // 2. Logged Tasks (Extra or Daily)
    const loggedTaskIds = empLogs.map(l => l.taskId);

    // Unique IDs
    const allRelevantTaskIds = Array.from(new Set([...assignedTaskIds, ...loggedTaskIds]));

    return allRelevantTaskIds.map(taskId => {
        // Identify Task Name
        let taskName = "مهمة غير معروفة";
        let isAssigned = false;
        
        if (taskId === 'EXTRA' || taskId.startsWith('EXTRA-')) {
             taskName = "مهام إضافية متنوعة";
        } else {
            const tDef = tasks.find(t => t.id === taskId);
            if (tDef) {
                taskName = tDef.description;
                isAssigned = true;
            } else {
                 const logExample = empLogs.find(l => l.taskId === taskId);
                 if (logExample) taskName = logExample.description;
            }
        }

        // Stats
        const relevantLogs = empLogs.filter(l => l.taskId === taskId || (taskId === 'EXTRA' && l.taskType === 'Extra'));
        const totalLogged = relevantLogs.length;
        const completed = relevantLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
        const pending = relevantLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
        const na = relevantLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;

        return {
            taskId,
            desc: taskName,
            isAssigned,
            totalLogged,
            completed,
            pending,
            na
        };
    }).sort((a, b) => b.totalLogged - a.totalLogged); // Sort by most active
  }, [empLogs, assignments, tasks, selectedEmpId]);

  // --- Totals for Charts ---
  const totals = useMemo(() => {
    const executed = empLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
    const notExecuted = empLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
    const na = empLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;
    const total = executed + notExecuted + na;
    return { executed, notExecuted, na, total };
  }, [empLogs]);

  // Comparison Helpers
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
        <div className="mt-4 flex gap-4 text-xs font-bold">
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
        const filename = `Report_${selectedEmployee.name}.csv`;
        downloadCSV(csvContent, filename);
    } else {
        csvContent += "الترتيب,اسم الموظف,التقارير المسجلة,إجمالي المهام,المهام المنفذة,نسبة الإنجاز\n";
        comparisonData.forEach((d, idx) => {
            csvContent += `"${idx + 1}","${d.name}","${d.daysPresent}","${d.total}","${d.completed}","${d.rate.toFixed(1)}%"\n`;
        });
        const filename = `Comparison_Report.csv`;
        downloadCSV(csvContent, filename);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setTimeout(() => {
        window.print();
    }, 100);
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0 print:p-0">
      
      {/* --- Controls Header (Hidden in Print) --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 print:hidden">
        
        {/* Top Row: View Mode Switcher */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('individual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'individual' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Briefcase size={16} /> تقرير فردي
                </button>
                <button 
                  onClick={() => setViewMode('comparative')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'comparative' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <TrendingUp size={16} /> مقارنة الأداء
                </button>
            </div>
            
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors font-bold">
                    <FileSpreadsheet size={16} /> تصدير Excel
                </button>
                <button type="button" onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors font-bold">
                    <Printer size={16} /> طباعة
                </button>
            </div>
        </div>

        {/* Bottom Row: Filters & Dates */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
             {/* Employee Selector (Only for Individual) */}
             {viewMode === 'individual' && (
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">الموظف</label>
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-gray-400" />
                        <select 
                            value={selectedEmpId} 
                            onChange={(e) => setSelectedEmpId(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[220px]"
                        >
                            {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
             )}

             {/* Comparison Scope (Only for Comparative) */}
             {viewMode === 'comparative' && (
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">نطاق المقارنة</label>
                    <div className="relative group">
                        <button className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-300 rounded-lg p-2.5 min-w-[220px] text-sm">
                            <span>{selectedComparisonIds.length > 0 ? `تم تحديد ${selectedComparisonIds.length} موظف` : 'جميع الموظفين'}</span>
                            <Filter size={16} className="text-gray-400"/>
                        </button>
                        {/* Dropdown for Multi-Select */}
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block p-2 max-h-60 overflow-y-auto">
                            <button onClick={selectAllComparison} className="text-xs text-indigo-600 font-bold mb-2 hover:underline block w-full text-right px-1">
                                {selectedComparisonIds.length === employees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                            </button>
                            {employees.map(emp => (
                                <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedComparisonIds.includes(emp.id)} 
                                      onChange={() => toggleComparisonId(emp.id)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 truncate">{emp.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
             )}

             {/* Date Range Picker */}
             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">الفترة الزمنية</label>
                   <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setDateRangeType('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'week' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>أسبوع</button>
                        <button onClick={() => setDateRangeType('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>شهر</button>
                        <button onClick={() => setDateRangeType('custom')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRangeType === 'custom' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>مخصص</button>
                   </div>
                </div>
                
                {/* Custom Date Inputs */}
                {dateRangeType === 'custom' && (
                    <div className="flex gap-2 items-center animate-fade-in">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1">من تاريخ</label>
                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1">إلى تاريخ</label>
                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                        </div>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* --- CONTENT AREA (Printable) --- */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 print:w-full print:rounded-none">
        
        {/* Common Report Header */}
        <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-start print:pb-4 print:mb-4">
           <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold print:bg-indigo-600 print:text-white print:border print:border-gray-900">
               ن
             </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900 print:text-xl">
                    {viewMode === 'individual' ? 'تقرير الأداء الفردي' : 'تقرير مقارنة الأداء'}
                </h2>
                <p className="text-gray-500 mt-1 text-sm">نظام مُيسّر المهام - التحليلات المتقدمة</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-1 rounded w-fit print:bg-transparent print:p-0">
                    <Calendar size={12} />
                    {startDate.toLocaleDateString('ar-EG')} - {endDate.toLocaleDateString('ar-EG')}
                </div>
             </div>
           </div>
           {viewMode === 'individual' && (
            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-100 print:bg-transparent print:border print:border-gray-300 print:p-2">
                <h3 className="text-xl font-bold text-indigo-700 print:text-black">{selectedEmployee?.name}</h3>
                <p className="text-gray-600 font-medium text-sm">{selectedEmployee?.jobTitle}</p>
                <p className="text-xs text-gray-400 mt-1">يتم عرض البيانات للسجلات المعتمدة والمعلقة</p>
            </div>
           )}
        </div>

        {/* === INDIVIDUAL REPORT === */}
        {viewMode === 'individual' && (
            <div className="space-y-8">
                {/* Attendance Summary */}
                <h4 className="font-bold text-gray-800 border-r-4 border-blue-500 pr-3 text-lg print:text-base">تحليل أيام العمل والالتزام</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 print:bg-white print:border-gray-300">
                        <p className="text-xs text-blue-600 font-bold mb-1 print:text-black">التقارير المتوقعة (الصافية)</p>
                        <p className="text-2xl font-bold text-blue-800 print:text-black">{adherenceStats.netExpectedWorkDays}</p>
                        <p className="text-[10px] text-gray-400 print:hidden">بعد خصم العطلات والإجازات</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 print:bg-white print:border-gray-300">
                        <p className="text-xs text-green-600 font-bold mb-1 print:text-black">التقارير المسجلة</p>
                        <p className="text-2xl font-bold text-green-800 print:text-black">{adherenceStats.presentDays}</p>
                    </div>
                    {/* New Compliance Card */}
                    <div className={`p-4 rounded-xl border print:bg-white print:border-gray-300 ${
                        adherenceStats.attendanceRate >= 90 ? 'bg-emerald-50 border-emerald-100' :
                        adherenceStats.attendanceRate >= 75 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                        <p className={`text-xs font-bold mb-1 print:text-black ${
                             adherenceStats.attendanceRate >= 90 ? 'text-emerald-600' :
                             adherenceStats.attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600'
                        }`}>نسبة الالتزام بالتقارير</p>
                        <div className="flex items-end gap-2">
                             <p className={`text-2xl font-bold print:text-black ${
                                 adherenceStats.attendanceRate >= 90 ? 'text-emerald-800' :
                                 adherenceStats.attendanceRate >= 75 ? 'text-amber-800' : 'text-red-800'
                             }`}>{adherenceStats.attendanceRate}%</p>
                             <Clock size={18} className="mb-1 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 print:bg-white print:border-gray-300">
                        <p className="text-xs text-orange-600 font-bold mb-1 print:text-black">الإجازات والعطلات</p>
                        <p className="text-2xl font-bold text-orange-800 print:text-black">{adherenceStats.weeklyHolidays + adherenceStats.officialLeaves}</p>
                    </div>
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 break-before-page avoid-break">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col items-center justify-center print:bg-white print:border-gray-300">
                        <h5 className="font-bold text-gray-700 mb-4 text-sm">جودة التنفيذ (للمهام المسجلة)</h5>
                        {totals.total > 0 ? renderDonutChart() : <p className="text-gray-400 text-sm">لا توجد بيانات</p>}
                        <div className="mt-6 w-full space-y-2 text-xs text-gray-600">
                            <div className="flex justify-between border-b border-gray-200 pb-1"><span>إجمالي المهام المسجلة</span><span className="font-bold">{totals.total}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-1"><span>نسبة الإنجاز</span><span className="font-bold text-green-600">{totals.total > 0 ? Math.round((totals.executed / totals.total) * 100) : 0}%</span></div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-bold text-gray-800 mb-4 border-r-4 border-indigo-500 pr-3 text-lg print:text-base">تحليل أداء جميع المهام المعينة</h4>
                        {taskBreakdown.length > 0 ? taskBreakdown.map((item, idx) => {
                            const execPercent = item.totalLogged > 0 ? Math.round((item.completed / item.totalLogged) * 100) : 0;
                            // Avoid division by zero for adherence
                            const expectedCoverage = adherenceStats.netExpectedWorkDays > 0 
                                ? Math.round((item.completed / adherenceStats.netExpectedWorkDays) * 100) 
                                : 0;
                            
                            return (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm print:shadow-none print:border-gray-300 avoid-break">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-gray-800 text-sm max-w-[70%]">{item.desc}</h5>
                                    <div className="text-left">
                                        <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 print:border-gray-400 print:text-black">
                                            تم التنفيذ: <b>{item.completed}</b> / {adherenceStats.netExpectedWorkDays} يوم
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar - Improved Visibility */}
                                <div className="mb-2">
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                        <span>نسبة الالتزام بالهدف (التقارير المتوقعة)</span>
                                    </div>
                                    <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden print:border print:border-gray-300 relative">
                                        {/* Filled Part */}
                                        <div 
                                            className={`h-full absolute top-0 right-0 rounded-full transition-all duration-500 ${
                                                expectedCoverage >= 90 ? 'bg-green-500' : 
                                                expectedCoverage >= 70 ? 'bg-yellow-400' : 
                                                'bg-red-400'
                                            } print:bg-gray-700`}
                                            style={{ width: `${Math.min(expectedCoverage, 100)}%` }}
                                        ></div>
                                        {/* Text Overlay - Centered with drop shadow for visibility */}
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <span className="text-[10px] font-bold text-gray-800 drop-shadow-md bg-white/30 px-2 rounded-full backdrop-blur-[1px]">
                                              {expectedCoverage}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-400 print:border-gray-200">
                                    <span>جودة التنفيذ (منفذة/مسجلة): {execPercent}%</span>
                                    <span>مرات التسجيل: {item.totalLogged}</span>
                                    <span>غير منفذة: {item.pending}</span>
                                </div>
                            </div>
                            )
                        }) : (
                            <div className="text-center py-4 text-gray-400 border border-dashed rounded-lg">لا توجد مهام روتينية مسجلة</div>
                        )}
                    </div>
                </div>

                {/* Detailed Logs (Hidden on Print) */}
                <div className="print:hidden">
                  <h4 className="font-bold text-gray-800 mb-4 border-r-4 border-purple-500 pr-3 text-lg break-before-page">سجل المهام التفصيلي (الكامل)</h4>
                  <div className="overflow-hidden border border-gray-200 rounded-xl">
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                              <tr>
                                  <th className="px-4 py-3">التاريخ</th>
                                  <th className="px-4 py-3">نوع المهمة</th>
                                  <th className="px-4 py-3">وصف المهمة</th>
                                  <th className="px-4 py-3">الحالة</th>
                                  <th className="px-4 py-3">المصادقة</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {empLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-600 font-mono text-xs" dir="ltr">{new Date(log.logDate).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">
                                      {log.status === 'Leave' || log.status === 'إجازة' || log.status === 'عطلة' ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">إجازة</span> : 
                                      log.taskType === 'Extra' ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200">إضافية</span> : 
                                      <span className="text-gray-500 text-xs">روتينية</span>}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-800">{log.description}</td>
                                  <td className="px-4 py-3">
                                      {(log.status === 'Completed' || log.status === 'منفذة') ? (
                                          <span className="text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 text-xs">منفذة</span>
                                      ) : (log.status === 'Pending' || log.status === 'غير منفذة') ? (
                                          <span className="text-red-700 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 text-xs">غير منفذة</span>
                                      ) : (log.status === 'NotApplicable' || log.status === 'لا تنطبق') ? (
                                          <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 text-xs">لا تنطبق</span>
                                      ) : (log.status === 'Leave' || log.status === 'إجازة' || log.status === 'عطلة') ? (
                                          <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100 text-xs">عطلة</span>
                                      ) : (
                                          <span className="text-gray-600 text-xs border border-gray-200 px-2 py-1 rounded">{String(log.status || 'غير محدد')}</span>
                                      )}
                                  </td>
                                  <td className="px-4 py-3">
                                      {log.approvalStatus === 'Approved' ? 
                                        <span className="text-green-600 text-xs font-bold flex items-center gap-1"><Check size={12}/> معتمد</span> : 
                                        log.approvalStatus === 'Rejected' ? 
                                        <span className="text-red-600 text-xs font-bold flex items-center gap-1"><X size={12}/> مرفوض</span> : 
                                        <span className="text-amber-500 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> معلق</span>
                                      }
                                  </td>
                                  </tr>
                              ))}
                              {empLogs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد بيانات للفترة المحددة</td></tr>}
                          </tbody>
                      </table>
                  </div>
                </div>
            </div>
        )}
        
        {/* === COMPARATIVE REPORT === */}
        {viewMode === 'comparative' && (
            <div className="space-y-10">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-blue-800 text-sm print:bg-white print:border-gray-300 print:text-black">
                    <TrendingUp size={20} />
                    <p>يعرض هذا التقرير مقارنة بين أداء الموظفين بناءً على المهام الروتينية المسجلة (المعتمدة والمعلقة) خلال الفترة المحددة.</p>
                </div>

                {/* 1. Ranking Chart (Completion Rate) */}
                <div>
                    <h4 className="font-bold text-gray-800 mb-6 border-r-4 border-green-500 pr-3 text-lg print:text-base">ترتيب نسب الإنجاز</h4>
                    <div className="space-y-4">
                        {comparisonData.length > 0 ? comparisonData.map((data, idx) => (
                            <div key={data.id} className="relative avoid-break">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span className="text-gray-700 flex items-center gap-2">
                                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-600 print:border print:border-gray-400">{idx + 1}</span>
                                        {data.name}
                                    </span>
                                    <span className="text-gray-900">{data.rate.toFixed(1)}%</span>
                                </div>
                                {/* FIXED PROGRESS BAR - VISIBILITY FIX */}
                                <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden print:border print:border-gray-300 relative text-center">
                                    <div 
                                        className={`h-full absolute top-0 right-0 rounded-full ${data.rate >= 90 ? 'bg-green-500' : data.rate >= 70 ? 'bg-blue-500' : data.rate >= 50 ? 'bg-orange-500' : 'bg-red-500'} print:bg-gray-800`}
                                        style={{ width: `${data.rate}%` }}
                                    ></div>
                                    <span className="relative z-10 text-[10px] font-bold leading-5 text-gray-800 drop-shadow-sm px-2 bg-white/20 backdrop-blur-[1px] rounded-full inline-block mt-0.5">
                                        {data.rate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 py-8">لا توجد بيانات للعرض أو لم يتم تحديد موظفين</div>}
                    </div>
                </div>

                {/* 2. Volume Chart (Total vs Completed) */}
                <div className="break-before-page avoid-break">
                    <h4 className="font-bold text-gray-800 mb-6 border-r-4 border-purple-500 pr-3 text-lg print:text-base">حجم العمل (إجمالي المهام vs المنفذة)</h4>
                    <div className="space-y-6">
                        {comparisonData.map(data => {
                            if (data.total === 0) return null;
                            const maxVal = Math.max(...comparisonData.map(d => d.total));
                            const widthPercent = (data.total / maxVal) * 100;
                            const completedWidth = (data.completed / data.total) * 100;
                            
                            return (
                                <div key={data.id} className="flex items-center gap-4 avoid-break">
                                    <div className="w-32 text-sm font-bold text-gray-600 truncate text-left pl-2">{data.name}</div>
                                    <div className="flex-1">
                                        <div className="h-8 bg-gray-100 rounded-r-lg relative flex items-center print:border print:border-gray-300" style={{ width: `${Math.max(widthPercent, 10)}%` }}>
                                            {/* Completed Portion */}
                                            <div 
                                                className="h-full bg-purple-200 rounded-r-lg absolute top-0 right-0 flex items-center justify-center text-xs font-bold text-purple-900 border-r-4 border-purple-500 print:bg-gray-400 print:text-black print:border-black"
                                                style={{ width: `${completedWidth}%` }}
                                            >
                                                {data.completed}
                                            </div>
                                            {/* Total Label (at the end of bar) */}
                                            <span className="absolute left-2 text-xs font-bold text-gray-500">{data.total} مهمة</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex gap-6 justify-center mt-4 text-xs font-bold text-gray-500">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-100 border border-gray-300"></span> إجمالي المهام</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-200 border-r-4 border-purple-500 print:bg-gray-400"></span> المهام المنفذة</div>
                    </div>
                </div>

                {/* 3. Detailed Data Table */}
                <div className="break-before-page">
                    <h4 className="font-bold text-gray-800 mb-4 border-r-4 border-blue-500 pr-3 text-lg print:text-base">جدول البيانات المقارن</h4>
                    <div className="overflow-hidden border border-gray-200 rounded-xl">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3">الترتيب</th>
                                    <th className="px-4 py-3">الموظف</th>
                                    <th className="px-4 py-3">التقارير المسجلة</th> {/* CHANGED LABEL */}
                                    <th className="px-4 py-3">إجمالي المهام المسندة</th>
                                    <th className="px-4 py-3">المهام المنفذة</th>
                                    <th className="px-4 py-3">نسبة الإنجاز</th>
                                    <th className="px-4 py-3">التقييم</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {comparisonData.map((data, idx) => (
                                    <tr key={data.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-500">#{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-gray-800">{data.name}</td>
                                        <td className="px-4 py-3 font-bold text-blue-700">{data.daysPresent}</td>
                                        <td className="px-4 py-3">{data.total}</td>
                                        <td className="px-4 py-3 text-green-700 font-bold">{data.completed}</td>
                                        <td className="px-4 py-3 font-mono">{data.rate.toFixed(1)}%</td>
                                        <td className="px-4 py-3">
                                            {data.rate >= 90 ? <span className="text-green-600 font-bold">ممتاز</span> :
                                            data.rate >= 80 ? <span className="text-blue-600 font-bold">جيد جداً</span> :
                                            data.rate >= 70 ? <span className="text-indigo-600 font-bold">جيد</span> :
                                            data.rate >= 50 ? <span className="text-orange-600 font-bold">مقبول</span> :
                                            <span className="text-red-600 font-bold">ضعيف</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
        
        {/* Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 avoid-break">
           <div className="text-center text-xs text-gray-500">
              تقرير تم إنشاؤه بواسطة نظام مُيسّر المهام - {new Date().toLocaleString('ar-EG')}
           </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsReports;

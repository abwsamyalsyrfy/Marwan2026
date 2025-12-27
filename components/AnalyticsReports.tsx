
import React, { useState, useMemo } from 'react';
import { Employee, TaskLog, Task, Assignment } from '../types';
import { Printer, Calendar, Filter, Briefcase, FileSpreadsheet, TrendingUp, Users } from 'lucide-react';

interface AnalyticsReportsProps {
  employees: Employee[];
  logs: TaskLog[];
  tasks: Task[]; 
  assignments: Assignment[]; 
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ employees, logs, tasks = [], assignments = [] }) => {
  const [viewMode, setViewMode] = useState<'individual' | 'comparative'>('individual');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [dateRangeType, setDateRangeType] = useState<'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-CA');
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // --- Helpers for Normalization ---
  const isLeaveStatus = (status: string) => ['Leave', 'إجازة', 'عطلة'].includes(status);
  const isCompletedStatus = (status: string) => ['Completed', 'منفذة'].includes(status);

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

  const comparisonData = useMemo(() => {
    let targetEmployees = employees;
    if (selectedComparisonIds.length > 0) {
        targetEmployees = employees.filter(e => selectedComparisonIds.includes(e.id));
    }
    return targetEmployees.map(emp => {
      const empOwnLogs = filteredLogs.filter(l => l.employeeId === emp.id && !isLeaveStatus(l.status));
      const uniqueDays = new Set(empOwnLogs.map(l => new Date(l.logDate).toLocaleDateString('en-CA'))).size;
      const total = empOwnLogs.length;
      const completed = empOwnLogs.filter(l => isCompletedStatus(l.status)).length;
      const rate = total > 0 ? (completed / total) * 100 : 0;
      return { id: emp.id, name: emp.name, total, completed, rate, daysPresent: uniqueDays };
    }).sort((a, b) => b.rate - a.rate);
  }, [employees, filteredLogs, selectedComparisonIds]);

  const adherenceStats = useMemo(() => {
    let grossWorkingDays = 0;
    let presentDaysCount = 0; 
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
    const effectiveEnd = new Date(endDate > new Date() ? new Date() : endDate);
    effectiveEnd.setHours(23,59,59,999);

    while (cursor.getTime() <= effectiveEnd.getTime()) {
       const dayOfWeek = cursor.getDay();
       const dateStr = cursor.toLocaleDateString('en-CA');
       const dayLogs = logsByDate.get(dateStr) || [];
       const isLeave = dayLogs.some(l => isLeaveStatus(l.status));
       const isWeekend = dayOfWeek === 4 || dayOfWeek === 5; // Thu, Fri

       if (isWeekend) {
           weeklyHolidays++;
       } else if (isLeave) {
           officialLeaves++;
           grossWorkingDays++;
       } else {
           grossWorkingDays++;
           if (dayLogs.length > 0) presentDaysCount++;
       }
       cursor.setDate(cursor.getDate() + 1);
    }

    const netExpectedWorkDays = Math.max(0, grossWorkingDays - officialLeaves);
    const attendanceRate = netExpectedWorkDays > 0 ? Math.round((presentDaysCount / netExpectedWorkDays) * 100) : 0;
    return { grossWorkingDays, netExpectedWorkDays, presentDays: presentDaysCount, weeklyHolidays, officialLeaves, attendanceRate };
  }, [startDate, endDate, empLogs]);

  const taskBreakdown = useMemo(() => {
    if (!selectedEmpId) return [];
    const assignedTaskIds = assignments.filter(a => a.employeeId === selectedEmpId).map(a => a.taskId);
    const routineTasks = tasks.filter(t => assignedTaskIds.includes(t.id));
    return routineTasks.map(task => {
        const relevantLogs = empLogs.filter(l => l.taskId === task.id);
        const completed = relevantLogs.filter(l => isCompletedStatus(l.status)).length;
        return { taskId: task.id, desc: task.description, completed };
    });
  }, [empLogs, assignments, tasks, selectedEmpId]);

  const totals = useMemo(() => {
    const executed = empLogs.filter(l => isCompletedStatus(l.status)).length;
    const notExecuted = empLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
    const na = empLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;
    const total = executed + notExecuted + na;
    return { executed, notExecuted, na, total };
  }, [empLogs]);

  const exportToCSV = () => {
    if (viewMode === 'individual' && !selectedEmployee) return;
    const BOM = "\uFEFF";
    let csvContent = BOM;
    if (viewMode === 'individual' && selectedEmployee) {
        csvContent += "التاريخ,الموظف,النوع,المهمة,الحالة\n";
        empLogs.forEach(log => {
          csvContent += `"${new Date(log.logDate).toLocaleDateString('ar-EG')}","${selectedEmployee.name}","${log.taskType}","${log.description}","${log.status}"\n`;
        });
    } else {
        csvContent += "الترتيب,الموظف,التقارير,المنفذة,النسبة\n";
        comparisonData.forEach((d, idx) => {
            csvContent += `"${idx + 1}","${d.name}","${d.daysPresent}","${d.completed}","${d.rate.toFixed(1)}%"\n`;
        });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${viewMode}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0 print:p-0">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('individual')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'individual' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><Briefcase size={16} /> تقرير فردي</button>
                <button onClick={() => setViewMode('comparative')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'comparative' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><TrendingUp size={16} /> مقارنة الأداء</button>
            </div>
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Printer size={16} /> طباعة</button>
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
             {viewMode === 'individual' && (
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">الموظف</label>
                    <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-lg block p-2.5 min-w-[220px]">
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
             )}
             <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setDateRangeType('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${dateRangeType === 'week' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>أسبوع</button>
                    <button onClick={() => setDateRangeType('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${dateRangeType === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>شهر</button>
                    <button onClick={() => setDateRangeType('custom')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${dateRangeType === 'custom' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>مخصص</button>
                </div>
                {dateRangeType === 'custom' && (
                    <div className="flex gap-2 animate-fade-in">
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-2 border rounded-lg text-sm bg-gray-50" />
                    </div>
                )}
             </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
        <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-start">
           <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">ن</div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewMode === 'individual' ? 'تقرير الأداء الفردي المعتمد' : 'تقرير مقارنة أداء الفريق'}</h2>
                <p className="text-gray-500 text-sm mt-1">الفترة: {startDate.toLocaleDateString('ar-EG')} - {endDate.toLocaleDateString('ar-EG')}</p>
             </div>
           </div>
           {viewMode === 'individual' && (
            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-xl font-bold text-indigo-700">{selectedEmployee?.name}</h3>
                <p className="text-gray-600 font-medium text-sm">{selectedEmployee?.jobTitle}</p>
            </div>
           )}
        </div>

        {viewMode === 'individual' && (
            <div className="space-y-8">
                <h4 className="font-bold text-gray-800 border-r-4 border-blue-500 pr-3 text-lg">تحليل الالتزام بالتقارير (باستثناء العطلات)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold mb-1">أيام العمل المتوقعة</p>
                        <p className="text-2xl font-bold text-blue-800">{adherenceStats.netExpectedWorkDays}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-xs text-green-600 font-bold mb-1">التقارير المرفوعة</p>
                        <p className="text-2xl font-bold text-green-800">{adherenceStats.presentDays}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${adherenceStats.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        <p className="text-xs font-bold mb-1">نسبة الالتزام</p>
                        <p className="text-2xl font-bold">{adherenceStats.attendanceRate}%</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <p className="text-xs text-orange-600 font-bold mb-1">إجازات مسجلة</p>
                        <p className="text-2xl font-bold text-orange-800">{adherenceStats.officialLeaves}</p>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <h4 className="font-bold text-gray-800 mb-4 border-r-4 border-indigo-500 pr-3 text-lg">تحليل تنفيذ المهام الروتينية</h4>
                    {taskBreakdown.length > 0 ? taskBreakdown.map((item, idx) => {
                        const coverage = adherenceStats.netExpectedWorkDays > 0 ? Math.round((item.completed / adherenceStats.netExpectedWorkDays) * 100) : 0;
                        return (
                        <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h5 className="font-bold text-gray-800 text-sm">{item.desc}</h5>
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">منفذة: <b>{item.completed}</b> مرة</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                <div className={`h-full ${coverage >= 90 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(coverage, 100)}%` }}></div>
                            </div>
                        </div>
                        )
                    }) : <div className="text-center py-6 text-gray-400">لا توجد مهام روتينية</div>}
                </div>
            </div>
        )}
        
        {viewMode === 'comparative' && (
            <div className="space-y-10">
                <div className="space-y-4">
                    {comparisonData.length > 0 ? comparisonData.map((data, idx) => (
                        <div key={data.id}>
                            <div className="flex justify-between text-sm font-bold mb-1">
                                <span>#{idx + 1} {data.name}</span>
                                <span>{data.rate.toFixed(1)}%</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${data.rate >= 90 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${data.rate}%` }}></div>
                            </div>
                        </div>
                    )) : <div className="text-center text-gray-400 py-8">لا توجد بيانات</div>}
                </div>
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">الموظف</th>
                                <th className="px-4 py-3 text-center">التقارير</th>
                                <th className="px-4 py-3 text-center">المنفذة</th>
                                <th className="px-4 py-3 text-center">النسبة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {comparisonData.map((data) => (
                                <tr key={data.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-bold">{data.name}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{data.daysPresent}</td>
                                    <td className="px-4 py-3 text-center text-green-700">{data.completed}</td>
                                    <td className="px-4 py-3 text-center font-bold">{data.rate.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">نظام مُيسّر المهام - تقرير آلي دقيق مستخرج بتاريخ {new Date().toLocaleString('ar-EG')}</div>
      </div>
    </div>
  );
};

export default AnalyticsReports;

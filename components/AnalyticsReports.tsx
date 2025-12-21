
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, TaskLog, Task, Assignment } from '../types';
import { Printer, Calendar, Users, Activity, FileSpreadsheet, Clock, ChevronDown, AlertCircle, X, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';

interface AnalyticsReportsProps {
  employees: Employee[];
  logs: TaskLog[];
  tasks: Task[]; 
  assignments: Assignment[]; 
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ employees, logs, tasks, assignments }) => {
  const [viewMode, setViewMode] = useState<'individual' | 'collective'>('individual');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [timePreset, setTimePreset] = useState<'week' | 'month' | 'custom'>('month');
  
  // فلتر الموظفين لمقارنة الأداء
  const [selectedComparisonEmps, setSelectedComparisonEmps] = useState<string[]>(employees.map(e => e.id));
  const [showEmpSelector, setShowEmpSelector] = useState(false);

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // تحديث نطاق التاريخ عند تغيير الاختيار السريع
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    if (timePreset === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (timePreset === 'month') {
      start.setDate(end.getDate() - 30);
    } else {
      return; 
    }
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, [timePreset]);

  // حساب أيام العمل (باستثناء الخميس 4 والجمعة 5)
  const workDaysInRange = useMemo(() => {
    const days: string[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 4 && dayOfWeek !== 5) {
        days.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [dateRange]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const d = l.logDate?.split('T')[0];
      return d >= dateRange.start && d <= dateRange.end && l.approvalStatus !== 'Rejected';
    });
  }, [logs, dateRange]);

  const individualStats = useMemo(() => {
    const userLogs = filteredLogs.filter(l => l.employeeId === selectedEmpId);
    
    const loggedWorkDates = new Set(userLogs.filter(l => l.status !== 'Leave' && l.status !== 'إجازة').map(l => l.logDate.split('T')[0]));
    const leaveDates = new Set(userLogs.filter(l => l.status === 'Leave' || l.status === 'إجازة').map(l => l.logDate.split('T')[0]));
    
    const expected = workDaysInRange.length;
    const reportedCount = loggedWorkDates.size;
    const leaveCount = leaveDates.size;
    
    const commitmentRate = expected > 0 ? Math.round((reportedCount / expected) * 100) : 0;

    const userAssignments = assignments.filter(a => a.employeeId === selectedEmpId);
    
    const taskAnalysis = userAssignments.map(asn => {
      const tLogs = userLogs.filter(l => l.taskId === asn.taskId);
      const timesLogged = tLogs.length;
      const done = tLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
      const failed = tLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
      const na = tLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;
      
      const qualityRate = timesLogged > 0 ? Math.round((done / timesLogged) * 100) : 0;
      
      return { 
        id: asn.taskId, 
        desc: tasks.find(t => t.id === asn.taskId)?.description || 'مهمة غير معروفة',
        expected, 
        done, 
        timesLogged,
        failed,
        na,
        qualityRate,
        rate: expected > 0 ? Math.round((done / expected) * 100) : 0 
      };
    }).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    return { reportedCount, expected, leaveCount, commitmentRate, taskAnalysis };
  }, [filteredLogs, selectedEmpId, assignments, tasks, workDaysInRange]);

  const collectiveStats = useMemo(() => {
    return employees
      .filter(e => e.active && selectedComparisonEmps.includes(e.id))
      .map(emp => {
        const id = emp.id;
        const uLogs = filteredLogs.filter(l => l.employeeId === id);
        
        const loggedWorkDates = new Set(uLogs.filter(l => l.status !== 'Leave' && l.status !== 'إجازة').map(l => l.logDate.split('T')[0]));
        const actualReports = loggedWorkDates.size;
        
        const expectedWorkDays = workDaysInRange.length;
        const rate = expectedWorkDays > 0 ? Math.round((actualReports / expectedWorkDays) * 100) : 0;

        const completedCount = uLogs.filter(l => l.status === 'Completed' || l.status === 'منفذة').length;
        const pendingCount = uLogs.filter(l => l.status === 'Pending' || l.status === 'غير منفذة').length;
        const naCount = uLogs.filter(l => l.status === 'NotApplicable' || l.status === 'لا تنطبق').length;
        
        const totalTasksLogged = completedCount + pendingCount + naCount;
        const qualityRate = totalTasksLogged > 0 ? Math.round((completedCount / totalTasksLogged) * 100) : 0;
        
        let rating = 'ضعيف';
        if (rate >= 85) rating = 'ممتاز';
        else if (rate >= 70) rating = 'جيد جداً';
        else if (rate >= 50) rating = 'جيد';
        else if (rate >= 30) rating = 'مقبول';

        return { id, name: emp.name, rate, actual: actualReports, expected: expectedWorkDays, rating, completedCount, pendingCount, naCount, qualityRate };
      }).sort((a,b) => b.rate - a.rate);
  }, [filteredLogs, employees, workDaysInRange, selectedComparisonEmps]);

  const toggleEmpSelection = (id: string) => {
    setSelectedComparisonEmps(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* شريط الأدوات العلوي المطور حسب الصورة */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end print:hidden">
        <div className="flex-1 space-y-4">
           <div className="flex bg-gray-50 p-1.5 rounded-2xl w-fit">
              <button onClick={()=>setViewMode('individual')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${viewMode==='individual' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Users size={18}/> تقرير فردي</button>
              <button onClick={()=>setViewMode('collective')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${viewMode==='collective' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Activity size={18}/> مقارنة الأداء</button>
           </div>
           
           <div className="flex flex-col md:flex-row gap-4">
              {viewMode === 'individual' ? (
                <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">الموظف</label>
                  <div className="relative group">
                      <select value={selectedEmpId} onChange={e=>setSelectedEmpId(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent border-gray-100 p-3.5 rounded-2xl font-black text-gray-700 outline-none transition-all focus:border-indigo-200 appearance-none pr-12">
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      <Users className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
                      <ChevronDown className="absolute left-4 top-4 text-gray-300 pointer-events-none" size={18} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">تحديد الموظفين للمقارنة</label>
                  <button 
                    onClick={() => setShowEmpSelector(!showEmpSelector)}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-3.5 rounded-2xl font-black text-gray-700 flex items-center justify-between hover:border-indigo-100 transition-all h-[54px]"
                  >
                    <span className="text-xs">{selectedComparisonEmps.length === employees.length ? 'تم اختيار جميع الموظفين' : `تم اختيار ${selectedComparisonEmps.length} موظف`}</span>
                    <ChevronDown size={18} className={`transition-transform ${showEmpSelector ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showEmpSelector && (
                    <div className="absolute top-full right-0 left-0 mt-2 bg-white border border-gray-100 rounded-[24px] shadow-2xl z-50 p-4 max-h-[300px] overflow-y-auto animate-scale-in">
                       <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                          <button onClick={() => setSelectedComparisonEmps(employees.map(e => e.id))} className="text-[10px] font-black text-indigo-600 uppercase">تحديد الكل</button>
                          <button onClick={() => setSelectedComparisonEmps([])} className="text-[10px] font-black text-red-500 uppercase">إلغاء الكل</button>
                       </div>
                       <div className="space-y-1">
                          {employees.map(e => (
                            <label key={e.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer group transition-colors">
                               <input 
                                type="checkbox" 
                                checked={selectedComparisonEmps.includes(e.id)} 
                                onChange={() => toggleEmpSelection(e.id)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                               />
                               <div className="flex-1">
                                  <p className={`text-sm font-black ${selectedComparisonEmps.includes(e.id) ? 'text-indigo-600' : 'text-gray-500'}`}>{e.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold">{e.jobTitle}</p>
                               </div>
                            </label>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="min-w-[280px]">
                 <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">الفترة الزمنية</label>
                 <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100 h-[54px] items-center">
                    <button onClick={() => setTimePreset('week')} className={`flex-1 h-full rounded-xl text-xs font-black transition-all ${timePreset==='week' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>أسبوع</button>
                    <button onClick={() => setTimePreset('month')} className={`flex-1 h-full rounded-xl text-xs font-black transition-all ${timePreset==='month' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>شهر</button>
                    <button onClick={() => setTimePreset('custom')} className={`flex-1 h-full rounded-xl text-xs font-black transition-all ${timePreset==='custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>مخصص</button>
                 </div>
              </div>

              {timePreset === 'custom' && (
                <div className="flex gap-3 items-end animate-scale-in">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">من تاريخ</label>
                      <input type="date" value={dateRange.start} onChange={e=>setDateRange({...dateRange, start: e.target.value})} className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl font-black text-xs h-[54px] outline-none focus:border-indigo-200" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">إلى تاريخ</label>
                      <input type="date" value={dateRange.end} onChange={e=>setDateRange({...dateRange, end: e.target.value})} className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl font-black text-xs h-[54px] outline-none focus:border-indigo-200" />
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="flex gap-3">
           <button onClick={()=>window.print()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-indigo-50 hover:bg-indigo-700 transition-all"><Printer size={20}/> طباعة</button>
           <button className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-green-50 hover:bg-green-700 transition-all"><FileSpreadsheet size={20}/> تصدير Excel</button>
        </div>
      </div>

      {/* منطقة التقرير الرئيسية */}
      <div className="bg-white p-10 md:p-14 rounded-[48px] shadow-sm border border-gray-100 min-h-[900px] print:p-0 print:border-none print:shadow-none">
        
        {viewMode === 'individual' && (
          <div className="space-y-12 animate-fade-in">
            {/* الهيدر المطور */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-10 border-b border-gray-100 pb-12">
               <div className="flex items-center gap-8 order-2 lg:order-1">
                  <div className="w-16 h-16 bg-indigo-600 rounded-[22px] flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-200">ن</div>
                  <div className="text-center lg:text-right">
                     <h2 className="text-4xl font-black text-gray-900 leading-tight">تقرير الأداء الفردي</h2>
                     <p className="text-gray-400 font-bold mt-1 text-lg">نظام مُيسّر المهام - التحليلات المتقدمة</p>
                     <p className="text-xs text-indigo-500 font-black mt-3 flex items-center justify-center lg:justify-start gap-2 bg-indigo-50 w-fit px-4 py-1.5 rounded-full mx-auto lg:mx-0">
                        <Calendar size={14}/> {dateRange.start.replace(/-/g, '/')} - {dateRange.end.replace(/-/g, '/')}
                     </p>
                  </div>
               </div>
               
               <div className="p-8 bg-indigo-50/30 border-2 border-indigo-50 rounded-[40px] min-w-[340px] relative order-1 lg:order-2 flex flex-col items-center lg:items-end">
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-sm border border-indigo-50 flex items-center justify-center text-indigo-600">
                     <Users size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-indigo-900 text-center lg:text-right">{employees.find(e=>e.id===selectedEmpId)?.name}</h4>
                  <p className="text-lg font-bold text-gray-500 mt-1">{employees.find(e=>e.id===selectedEmpId)?.jobTitle}</p>
                  <p className="text-[10px] text-gray-400 mt-6 font-bold leading-relaxed text-center lg:text-right">يتم عرض البيانات للسجلات المعتمدة والمعلقة التي تم ترحيلها خلال الفترة الزمنية المحددة في الفلتر.</p>
               </div>
            </div>

            {/* تحليل أيام العمل والالتزام */}
            <div className="space-y-6">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 pr-2">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div> 
                    تحليل أيام العمل والالتزام
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-10 bg-blue-50/50 rounded-[40px] border border-blue-100 text-center flex flex-col justify-center items-center">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6">التقارير المتوقعة (الصافية)</p>
                        <h3 className="text-6xl font-black text-blue-900 mb-4">{individualStats.expected}</h3>
                        <p className="text-[10px] text-gray-400 font-bold">بعد خصم العطلات والإجازات</p>
                    </div>
                    
                    <div className="p-10 bg-green-50/50 rounded-[40px] border border-green-100 text-center flex flex-col justify-center items-center">
                        <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-6">التقارير المسجلة</p>
                        <h3 className="text-6xl font-black text-green-900">{individualStats.reportedCount}</h3>
                        <div className="w-10 h-1 bg-green-200 mt-4 rounded-full"></div>
                    </div>
                    
                    <div className="p-10 bg-red-50/50 rounded-[40px] border border-red-100 text-center flex flex-col justify-center items-center">
                        <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-6">نسبة الالتزام بالتقارير</p>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="text-6xl font-black text-red-900">{individualStats.commitmentRate}%</h3>
                            <Clock className="text-red-300" size={32} />
                        </div>
                        <div className="w-full bg-red-100 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{width: `${individualStats.commitmentRate}%`}}></div>
                        </div>
                    </div>
                    
                    <div className="p-10 bg-orange-50/50 rounded-[40px] border border-orange-100 text-center flex flex-col justify-center items-center">
                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-6">الإجازات والعطلات</p>
                        <h3 className="text-6xl font-black text-orange-900">{individualStats.leaveCount}</h3>
                        <div className="flex gap-2 mt-4">
                            {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-orange-200 rounded-full"></div>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* تحليل أداء المهام */}
            <div className="space-y-8 pt-8">
               <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 pr-2">
                 <div className="w-2 h-8 bg-indigo-600 rounded-full"></div> 
                 تحليل أداء جميع المهام المعينة
               </h3>
               
               <div className="space-y-10">
                  {individualStats.taskAnalysis.map(t => (
                    <div key={t.id} className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:translate-y-[-4px] group">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                          <div className="flex-1">
                             <h4 className="text-2xl font-black text-gray-800 leading-tight mb-3 group-hover:text-indigo-900 transition-colors">{t.id} - {t.desc}</h4>
                             <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">نسبة الالتزام بالهدف (التقارير المتوقعة)</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl text-xs font-black text-indigo-700 shadow-sm">
                                تم التنفيذ: {t.done} / {t.expected} يوم
                             </div>
                          </div>
                       </div>
                       
                       <div className="relative">
                          <div className="h-8 bg-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-100 p-1">
                             <div 
                                className={`h-full transition-all duration-1000 flex items-center justify-end px-6 rounded-full ${t.rate >= 80 ? 'bg-green-500' : t.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{width: `${t.rate}%`}}
                             >
                                <span className="text-[11px] font-black text-white">{t.rate}%</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-x-12 gap-y-4 mt-8 pt-8 border-t border-gray-50">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                             <CheckCircle2 size={16} className="text-green-500" />
                             منفذة: <span className="text-green-600 font-black">{t.done}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                             <XCircle size={16} className="text-red-500" />
                             غير منفذة: <span className="text-red-600 font-black">{t.failed}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                             <MinusCircle size={16} className="text-gray-400" />
                             لا تنطبق: <span className="text-gray-900 font-black">{t.na}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 border-r border-gray-100 pr-4">
                             جودة التنفيذ (منفذة/مسجلة): <span className="text-indigo-600 font-black">{t.qualityRate}%</span>
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  {individualStats.taskAnalysis.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                       <AlertCircle size={48} className="mx-auto text-gray-200 mb-4" />
                       <p className="text-gray-400 font-black text-xl">لا توجد مهام مسندة لهذا الموظف حالياً</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {viewMode === 'collective' && (
          <div className="space-y-16 animate-fade-in">
            <h2 className="text-5xl font-black text-gray-900 text-center leading-tight">تقرير مقارنة الأداء الإجمالي</h2>
            <div className="w-32 h-2 bg-indigo-600 mx-auto rounded-full"></div>
            
            <div className="space-y-10">
               <h3 className="text-3xl font-black text-gray-900 flex items-center gap-4"><div className="w-2 h-10 bg-green-500 rounded-full"></div> ترتيب نسب الإنجاز حسب الالتزام</h3>
               <div className="space-y-8 bg-gray-50/50 p-12 rounded-[60px] border border-gray-100">
                  {collectiveStats.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-8 group">
                       <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-sm text-gray-400 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">{idx+1}</div>
                       <div className="flex-1">
                          <div className="flex justify-between mb-3"><span className="font-black text-gray-800 text-lg">{s.name}</span><span className="font-black text-indigo-600 text-lg">{s.rate}%</span></div>
                          <div className="h-8 bg-white rounded-full overflow-hidden border-2 border-gray-100 p-1 shadow-inner"><div className="h-full bg-indigo-900 rounded-full transition-all duration-1000 shadow-lg" style={{width: `${s.rate}%`}}></div></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-10">
               <h3 className="text-3xl font-black text-gray-900 flex items-center gap-4"><div className="w-2 h-10 bg-blue-500 rounded-full"></div> جدول البيانات التفصيلي والتقييم</h3>
               <div className="overflow-x-auto rounded-[48px] border border-gray-100 shadow-xl overflow-hidden bg-white">
                  <table className="w-full text-right text-sm">
                     <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                           <th className="p-10">الموظف</th>
                           <th className="p-10 text-center">الالتزام بالتقارير</th>
                           <th className="p-10 text-center text-green-600">منفذة</th>
                           <th className="p-10 text-center text-red-600">غير منفذة</th>
                           <th className="p-10 text-center text-gray-500">لا تنطبق</th>
                           <th className="p-10 text-center">جودة التنفيذ %</th>
                           <th className="p-10">التقييم</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {collectiveStats.map(s => (
                           <tr key={s.id} className="hover:bg-indigo-50/30 transition-all duration-300">
                              <td className="p-10">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400">{s.name.charAt(0)}</div>
                                    <div><p className="font-black text-xl text-gray-900">{s.name}</p><p className="text-xs text-indigo-400 font-bold mt-1">ID: {s.id}</p></div>
                                 </div>
                              </td>
                              <td className="p-10 text-center">
                                 <p className="font-black text-2xl text-indigo-600">{s.rate}%</p>
                                 <p className="text-[10px] text-gray-400 font-bold">{s.actual} من {s.expected}</p>
                              </td>
                              <td className="p-10 text-center font-black text-2xl text-green-600">{s.completedCount}</td>
                              <td className="p-10 text-center font-black text-2xl text-red-600">{s.pendingCount}</td>
                              <td className="p-10 text-center font-black text-2xl text-gray-500">{s.naCount}</td>
                              <td className="p-10 text-center font-black text-2xl text-indigo-900">{s.qualityRate}%</td>
                              <td className="p-10">
                                 <span className={`px-8 py-3 rounded-2xl font-black text-xs border-2 shadow-sm ${
                                    s.rating === 'ممتاز' ? 'bg-green-50 border-green-200 text-green-700' : 
                                    s.rating === 'جيد جداً' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                    s.rating === 'مقبول' ? 'bg-orange-50 border-orange-200 text-orange-700' : 
                                    'bg-red-50 border-red-200 text-red-700'
                                 }`}>{s.rating}</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsReports;

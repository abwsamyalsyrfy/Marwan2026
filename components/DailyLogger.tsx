
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Task, Assignment, TaskLog } from '../types';
import { CheckCircle2, XCircle, ArrowLeft, Save, MinusCircle, CalendarOff, AlertTriangle, Clock, Calendar, PlusCircle, LayoutList, CalendarCheck, Briefcase, Info } from 'lucide-react';

interface DailyLoggerProps {
  currentUser: Employee;
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  onSaveLogs: (newLogs: TaskLog[]) => void;
  onCancel: () => void;
}

const DailyLogger: React.FC<DailyLoggerProps> = ({ currentUser, tasks, assignments, logs, onSaveLogs, onCancel }) => {
  const [step, setStep] = useState<'process-tasks' | 'extra-tasks' | 'register-leave'>('process-tasks');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskDecisions, setTaskDecisions] = useState<Record<string, 'Completed' | 'Pending' | 'NotApplicable'>>({});
  const [extraTasks, setExtraTasks] = useState<{description: string}[]>([]);
  const [newExtraTask, setNewExtraTask] = useState('');
  const [leaveType, setLeaveType] = useState('إجازة سنوية');

  // حساب الحدود الزمنية (اليوم و 3 أيام ماضية) لضمان عدم التلاعب
  const dateConstraints = useMemo(() => {
    const today = new Date();
    // لضمان استقرار التاريخ في المتصفحات المختلفة
    const maxStr = today.toISOString().split('T')[0];
    
    const min = new Date();
    min.setDate(today.getDate() - 3);
    const minStr = min.toISOString().split('T')[0];
    
    return { max: maxStr, min: minStr };
  }, []);

  // التحقق من أن اليوم هو الخميس (4) أو الجمعة (5)
  const isWeekend = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    return day === 4 || day === 5; 
  }, [selectedDate]);

  // فحص دقيق وشامل للسجلات السابقة (مقارنة التاريخ فقط YYYY-MM-DD)
  const hasExistingLogs = useMemo(() => {
    if (!selectedDate) return false;
    return logs.some(l => {
      const isSameUser = String(l.employeeId) === String(currentUser.id);
      // استخراج الجزء الخاص بالتاريخ فقط من سجلات قاعدة البيانات
      const logDateOnly = l.logDate.includes('T') ? l.logDate.split('T')[0] : l.logDate;
      return isSameUser && logDateOnly === selectedDate;
    });
  }, [logs, currentUser.id, selectedDate]);

  const sortedEmpAssignments = useMemo(() => {
    return assignments
      .filter(a => a.employeeId === currentUser.id)
      .sort((a, b) => a.taskId.localeCompare(b.taskId, undefined, {numeric: true}));
  }, [assignments, currentUser.id]);

  // تحديث حالة الواجهة عند تغيير التاريخ
  useEffect(() => {
    setTaskDecisions({});
    setExtraTasks([]);
    if (isWeekend) {
      setStep('extra-tasks');
    } else {
      setStep('process-tasks');
    }
  }, [selectedDate, isWeekend]);

  const toggleDecision = (taskId: string, status: 'Completed' | 'Pending' | 'NotApplicable') => {
    setTaskDecisions(prev => ({ ...prev, [taskId]: status }));
  };

  const handleRoutineFinished = () => {
    const pendingDecisions = sortedEmpAssignments.filter(a => !taskDecisions[a.taskId]);
    if (pendingDecisions.length > 0) {
      alert(`يرجى تحديد حالة جميع المهام أولاً (${pendingDecisions.length} متبقية)`);
      return;
    }
    setStep('extra-tasks');
  };

  const handleFinalSubmit = () => {
    // التحقق النهائي من القيود الزمنية قبل الإرسال
    if (selectedDate > dateConstraints.max || selectedDate < dateConstraints.min) {
      alert(`عذراً، مسموح فقط بالتسجيل ليوم ${dateConstraints.min} فما فوق.`);
      return;
    }

    if (hasExistingLogs) {
      alert("لقد قمت بالتسجيل مسبقاً لهذا التاريخ!");
      return;
    }

    const logDateISO = new Date(selectedDate).toISOString();
    let finalLogs: TaskLog[] = [];

    // في أيام العمل العادية فقط يتم تسجيل المهام الروتينية
    if (!isWeekend) {
        const routineLogs: TaskLog[] = sortedEmpAssignments.map(assignment => ({
          id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          logDate: logDateISO,
          employeeId: currentUser.id,
          taskId: assignment.taskId,
          taskType: 'Daily',
          status: taskDecisions[assignment.taskId] || 'Pending',
          description: tasks.find(t => t.id === assignment.taskId)?.description || 'مهمة روتينية',
          approvalStatus: 'PendingApproval'
        }));
        finalLogs = [...routineLogs];
    }

    const extraLogs: TaskLog[] = extraTasks.map((t, idx) => ({
      id: `EXTRA-${Date.now()}-${idx}`,
      logDate: logDateISO,
      employeeId: currentUser.id,
      taskId: 'EXTRA',
      taskType: 'Extra',
      status: 'Completed', 
      description: t.description,
      approvalStatus: 'PendingApproval'
    }));

    if (finalLogs.length === 0 && extraLogs.length === 0 && !isWeekend) {
      alert("يرجى إكمال المهمة الروتينية أو إضافة عمل إضافي واحد على الأقل");
      return;
    }

    onSaveLogs([...finalLogs, ...extraLogs]);
  };

  const handleLeaveSubmit = () => {
    onSaveLogs([{
      id: `LEAVE-${Date.now()}`,
      logDate: new Date(selectedDate).toISOString(),
      employeeId: currentUser.id,
      taskId: 'LEAVE',
      taskType: 'Daily',
      status: 'Leave',
      description: `طلب إجازة: ${leaveType}`,
      approvalStatus: 'PendingApproval'
    }]);
  };

  // شاشة التنبيه عند وجود سجل مسبق للتاريخ المختار
  if (hasExistingLogs) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-10 bg-white rounded-[40px] shadow-2xl border border-gray-100 text-center animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600"></div>
          <CalendarCheck className="mx-auto mb-6 text-indigo-600 drop-shadow-lg" size={80} />
          <h2 className="text-3xl font-black text-gray-900 mb-4">تم التسجيل مسبقاً</h2>
          <p className="text-gray-500 mb-6 text-lg">لقد قمت بإرسال تقرير مهامك لهذا اليوم (<span className="text-indigo-600 font-bold">{selectedDate}</span>) بنجاح.</p>
          
          <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl mb-8">
             <div className="flex items-center justify-center gap-2 text-amber-700 mb-2 font-black">
                <AlertTriangle size={20} />
                <span>تغيير التاريخ</span>
             </div>
             <p className="text-xs font-bold text-amber-600">يمكنك اختيار تاريخ آخر من القائمة في الأعلى (بحد أقصى 3 أيام ماضية) لتسجيل مهامك المتأخرة.</p>
          </div>

          <div className="flex flex-col gap-4">
            <button onClick={() => setStep('process-tasks')} className="w-full px-8 py-5 bg-gray-50 text-gray-700 border border-gray-200 rounded-[24px] font-black hover:bg-gray-100 transition-all active:scale-95 shadow-sm">اختر تاريخاً آخر</button>
            <button onClick={onCancel} className="w-full px-8 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xl shadow-xl shadow-indigo-100 active:scale-95 transition-all">العودة للرئيسية</button>
          </div>
      </div>
    );
  }

  if (step === 'register-leave') {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white p-10 rounded-[40px] shadow-2xl animate-scale-in border border-gray-50">
           <div className="text-center mb-8">
             <CalendarOff size={64} className="mx-auto mb-4 text-orange-500" />
             <h2 className="text-3xl font-black text-gray-900">تسجيل حالة إجازة</h2>
             <p className="text-gray-400 font-bold mt-2">تاريخ: {selectedDate}</p>
           </div>
           <div className="space-y-6 mb-10">
             <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-2">نوع الإجازة / العذر</label>
             <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-5 border-2 border-gray-50 rounded-[24px] bg-gray-50 font-black outline-none focus:border-orange-500 transition-all"><option value="إجازة سنوية">إجازة سنوية</option><option value="إجازة رسمية">إجازة رسمية / عيد</option><option value="إجازة مرضية">إجازة مرضية</option><option value="إجازة اضطرارية">إجازة اضطرارية</option></select>
           </div>
           <div className="flex gap-4"><button onClick={() => setStep(isWeekend ? 'extra-tasks' : 'process-tasks')} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-[24px] font-black">إلغاء</button><button onClick={handleLeaveSubmit} className="flex-1 py-5 bg-orange-600 text-white rounded-[24px] font-black text-xl shadow-xl shadow-orange-100 transition-all active:scale-95">تأكيد الإجازة</button></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
       <div className="mb-10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
             <div className="flex-1">
                <h2 className="text-4xl font-black text-gray-900">تسجيل النشاط اليومي</h2>
                <div className="flex items-center gap-4 mt-6">
                   <div className="bg-white px-5 py-3 rounded-2xl border-2 border-indigo-100 shadow-sm flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-400 uppercase">التاريخ المختار</span>
                      <input 
                        type="date" 
                        value={selectedDate} 
                        max={dateConstraints.max}
                        min={dateConstraints.min}
                        onChange={e => setSelectedDate(e.target.value)} 
                        className="bg-transparent font-black text-gray-800 outline-none cursor-pointer" 
                      />
                   </div>
                   <div className="hidden md:block">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المجال المتاح</p>
                      <p className="text-xs font-bold text-gray-500">{dateConstraints.min} ← {dateConstraints.max}</p>
                   </div>
                </div>
             </div>
             {!isWeekend && (
                <button onClick={() => setStep('register-leave')} className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 border-2 border-orange-100 rounded-[24px] font-black hover:bg-orange-50 transition-all shadow-sm">
                  <CalendarOff size={20} />
                  إجازة
                </button>
             )}
          </div>

          {/* تنبيه العطلة الأسبوعية - يظهر أيام الخميس والجمعة */}
          {isWeekend && (
             <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[32px] flex items-center gap-6 animate-scale-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100/50 rounded-bl-full"></div>
                <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shrink-0 shadow-2xl shadow-indigo-200">
                   <CalendarCheck size={32} />
                </div>
                <div>
                   <h4 className="text-2xl font-black text-indigo-900">عطلة أسبوعية سعيدة</h4>
                   <p className="text-indigo-700 font-bold mt-1 leading-relaxed">هذا اليوم هو عطلة رسمية (الخميس/الجمعة). تم تعطيل تسجيل المهام الروتينية، ولكن يمكنك تدوين أي "أعمال إضافية" قمت بها اليوم إن وجدت.</p>
                </div>
             </div>
          )}
       </div>

       {step === 'process-tasks' && !isWeekend ? (
         <div className="space-y-10 animate-fade-in">
            <div className="flex items-center gap-3 text-indigo-600 border-b border-indigo-50 pb-4">
              <LayoutList size={24} />
              <span className="text-sm font-black uppercase tracking-widest">المرحلة 1: المهام الروتينية المسندة إليك</span>
            </div>
            <div className="space-y-6">
              {sortedEmpAssignments.map((assignment, index) => {
                const task = tasks.find(t => t.id === assignment.taskId);
                const current = taskDecisions[assignment.taskId];
                return (
                  <div key={assignment.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all duration-300">
                     <div className="absolute top-0 right-0 bg-indigo-50 text-[11px] font-black p-3 text-indigo-400 border-b border-l rounded-bl-[20px] transition-colors group-hover:bg-indigo-600 group-hover:text-white">{index + 1}</div>
                     <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 text-gray-300 font-black">{assignment.taskId}</div>
                        <h4 className="text-2xl font-black text-gray-800 leading-relaxed pr-8">{task?.description}</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <button onClick={() => toggleDecision(task!.id, 'Completed')} className={`py-5 px-4 rounded-[24px] border-2 flex flex-col items-center gap-3 transition-all ${current === 'Completed' ? 'bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-100' : 'bg-white border-gray-100 text-gray-400 hover:border-green-200'}`}>
                         <CheckCircle2 size={32} />
                         <span className="font-black text-sm uppercase">نفذت المهمة</span>
                       </button>
                       <button onClick={() => toggleDecision(task!.id, 'Pending')} className={`py-5 px-4 rounded-[24px] border-2 flex flex-col items-center gap-3 transition-all ${current === 'Pending' ? 'bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-100' : 'bg-white border-gray-100 text-gray-400 hover:border-red-200'}`}>
                         <XCircle size={32} />
                         <span className="font-black text-sm uppercase">لم تنفذ</span>
                       </button>
                       <button onClick={() => toggleDecision(task!.id, 'NotApplicable')} className={`py-5 px-4 rounded-[24px] border-2 flex flex-col items-center gap-3 transition-all ${current === 'NotApplicable' ? 'bg-gray-100 border-gray-400 text-gray-700 shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                         <MinusCircle size={32} />
                         <span className="font-black text-sm uppercase">لا تنطبق اليوم</span>
                       </button>
                     </div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleRoutineFinished} className="w-full bg-indigo-600 text-white py-6 rounded-[32px] font-black text-2xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4">انتقل للمرحلة التالية <ArrowLeft size={28} /></button>
         </div>
       ) : (
         <div className="space-y-10 animate-fade-in">
            <div className="flex items-center gap-3 text-indigo-600 border-b border-indigo-50 pb-4">
               <PlusCircle size={24} />
               <span className="text-sm font-black uppercase tracking-widest">المرحلة 2: تدوين الأعمال الإضافية {isWeekend && "(فقط)"}</span>
            </div>
            
            <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm space-y-10">
               <div className="flex flex-col gap-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pr-2">اكتب وصف المهمة الإضافية</label>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="مثال: تجهيز ملفات جرد المستودع رقم 3..." 
                      className="flex-1 border-2 border-gray-50 rounded-[24px] px-8 py-5 font-black text-lg outline-none focus:border-indigo-100 focus:bg-white bg-gray-50 transition-all" 
                      value={newExtraTask} 
                      onChange={(e) => setNewExtraTask(e.target.value)} 
                      onKeyPress={(e) => e.key === 'Enter' && (newExtraTask.trim() && (setExtraTasks([...extraTasks, {description: newExtraTask}]), setNewExtraTask('')))} 
                    />
                    <button onClick={() => { if(newExtraTask.trim()) { setExtraTasks([...extraTasks, {description: newExtraTask}]); setNewExtraTask(''); } }} className="bg-indigo-600 text-white px-10 rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">إضافة</button>
                  </div>
               </div>
               
               <div className="space-y-4">
                   {extraTasks.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-indigo-50/30 p-6 rounded-[24px] border border-indigo-50 animate-slide-up group">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-black">{idx + 1}</div>
                           <span className="text-gray-800 font-bold text-lg">{t.description}</span>
                        </div>
                        <button onClick={() => setExtraTasks(extraTasks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-colors">
                          <XCircle size={24} />
                        </button>
                      </div>
                   ))}
                   {extraTasks.length === 0 && (
                     <div className="text-center py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                        <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-300 font-black text-lg">لا توجد أعمال إضافية مسجلة بعد...</p>
                        <p className="text-gray-300 text-xs font-bold mt-1">أضف المهام التي نفذتها خارج نطاق الروتين اليومي.</p>
                     </div>
                   )}
               </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
               {!isWeekend && (
                 <button onClick={() => setStep('process-tasks')} className="flex-1 py-6 bg-white text-gray-400 border-2 border-gray-100 rounded-[32px] font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                   رجوع للسابق
                 </button>
               )}
               <button 
                onClick={handleFinalSubmit} 
                className={`flex-[3] py-6 rounded-[32px] font-black text-2xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${extraTasks.length > 0 || isWeekend ? 'bg-green-600 text-white shadow-green-100 hover:bg-green-700' : 'bg-gray-200 text-gray-400 pointer-events-none'}`}
               >
                 <Save size={28} />
                 إرسال التقرير النهائي
               </button>
            </div>
         </div>
       )}
    </div>
  );
};

export default DailyLogger;

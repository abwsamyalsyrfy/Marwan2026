
import React, { useState, useMemo } from 'react';
import { Employee, Task, Assignment, TaskLog } from '../types';
// Added missing Sparkles import from lucide-react
import { CheckCircle2, XCircle, ArrowLeft, Save, MinusCircle, Plus, CalendarOff, AlertTriangle, Calendar, ChevronRight, ChevronLeft, ClipboardList, Sparkles } from 'lucide-react';

interface DailyLoggerProps {
  currentUser: Employee; // Logged in user
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  onSaveLogs: (newLogs: TaskLog[]) => void;
  onCancel: () => void;
}

const DailyLogger: React.FC<DailyLoggerProps> = ({ currentUser, tasks, assignments, logs, onSaveLogs, onCancel }) => {
  const [step, setStep] = useState<'process-tasks' | 'extra-tasks' | 'register-leave'>('process-tasks');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskDecisions, setTaskDecisions] = useState<Record<string, 'Completed' | 'Pending' | 'NotApplicable'>>({});
  const [extraTasks, setExtraTasks] = useState<{description: string}[]>([]);
  const [newExtraTask, setNewExtraTask] = useState('');
  const [leaveType, setLeaveType] = useState('Weekly');

  const empAssignments = useMemo(() => {
    return assignments.filter(a => a.employeeId === currentUser.id);
  }, [assignments, currentUser.id]);

  const hasExistingLogs = useMemo(() => {
    return logs.some(l => l.employeeId === currentUser.id && l.logDate.startsWith(selectedDate));
  }, [logs, currentUser.id, selectedDate]);

  const toggleDecision = (taskId: string, status: 'Completed' | 'Pending' | 'NotApplicable') => {
    setTaskDecisions(prev => ({ ...prev, [taskId]: status }));
    
    // Auto-advance to next task after 300ms for smoother experience
    if (currentTaskIndex < empAssignments.length - 1) {
      setTimeout(() => {
        setCurrentTaskIndex(prev => prev + 1);
      }, 300);
    }
  };

  const handleRoutineFinished = () => {
    const pendingDecisions = empAssignments.filter(a => !taskDecisions[a.taskId]);
    if (pendingDecisions.length > 0) {
      alert(`يرجى تحديد حالة جميع المهام (${pendingDecisions.length} متبقية)`);
      return;
    }
    setStep('extra-tasks');
  };

  const addExtraTask = () => {
    if (!newExtraTask.trim()) return;
    setExtraTasks([...extraTasks, { description: newExtraTask }]);
    setNewExtraTask('');
  };

  const getLogDateISO = () => {
    const targetDate = new Date(selectedDate);
    const now = new Date();
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return targetDate.toISOString();
  }

  const handleFinalSubmit = () => {
    const logDateISO = getLogDateISO();
    const routineLogs: TaskLog[] = empAssignments.map(assignment => {
      const taskDef = tasks.find(t => t.id === assignment.taskId);
      return {
        id: `LOG-${Date.now()}-${Math.random()}`,
        logDate: logDateISO,
        employeeId: currentUser.id,
        taskId: assignment.taskId,
        taskType: 'Daily',
        status: taskDecisions[assignment.taskId],
        description: taskDef ? taskDef.description : 'Task',
        approvalStatus: 'PendingApproval'
      };
    });

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

    onSaveLogs([...routineLogs, ...extraLogs]);
  };

  const handleLeaveSubmit = () => {
    const leaveLog: TaskLog = {
      id: `LEAVE-${Date.now()}`,
      logDate: getLogDateISO(),
      employeeId: currentUser.id,
      taskId: 'LEAVE',
      taskType: 'Daily',
      status: 'Leave',
      description: leaveType === 'Weekly' ? "عطلة أسبوعية" : "إجازة رسمية/مرضية",
      approvalStatus: 'PendingApproval'
    };
    onSaveLogs([leaveLog]);
  };

  if (hasExistingLogs) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-10 bg-white rounded-3xl shadow-xl border border-green-100 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">التقرير محفوظ</h2>
          <p className="text-gray-500 mb-8">لقد سجلت مهام اليوم ({selectedDate}) مسبقاً.</p>
          <button onClick={onCancel} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all">العودة للرئيسية</button>
      </div>
    );
  }

  // Register Leave View
  if (step === 'register-leave') {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarOff size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">تسجيل إجازة</h2>
          </div>
          <div className="space-y-4 mb-8">
             <label className="block text-sm font-bold text-gray-700">نوع الإجازة</label>
             <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none">
               <option value="Weekly">عطلة أسبوعية</option>
               <option value="Official">إجازة رسمية</option>
               <option value="Sick">إجازة مرضية</option>
             </select>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setStep('process-tasks')} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">إلغاء</button>
             <button onClick={handleLeaveSubmit} className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold">تأكيد</button>
          </div>
      </div>
    );
  }

  // Main Sequential Flow
  if (step === 'process-tasks') {
    const currentAssignment = empAssignments[currentTaskIndex];
    const currentTask = tasks.find(t => t.id === currentAssignment?.taskId);
    const progress = empAssignments.length > 0 ? ((currentTaskIndex + 1) / empAssignments.length) * 100 : 0;
    const currentDecision = currentAssignment ? taskDecisions[currentAssignment.taskId] : undefined;

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
         {/* Header with Progress Bar */}
         <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h2 className="text-xl font-bold text-gray-900">تسجيل المهام اليومية</h2>
                  <p className="text-sm text-gray-500">{selectedDate}</p>
               </div>
               <button onClick={() => setStep('register-leave')} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 hover:bg-orange-100 transition-colors">تسجيل إجازة</button>
            </div>
            
            <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
               <div 
                className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
               />
            </div>
            <div className="flex justify-between mt-2">
               <span className="text-[10px] font-bold text-gray-400">بدأ التسجيل</span>
               <span className="text-[10px] font-bold text-indigo-600">المهمة {currentTaskIndex + 1} من {empAssignments.length}</span>
               <span className="text-[10px] font-bold text-gray-400">النهاية</span>
            </div>
         </div>

         {/* Focused Task Card */}
         {empAssignments.length > 0 ? (
           <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <ClipboardList size={80} />
              </div>
              
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full mb-4 uppercase tracking-widest">المهمة الحالية</span>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-6">{currentTask?.description}</h3>
              </div>

              <div className="space-y-3 relative z-10">
                <button 
                  onClick={() => toggleDecision(currentTask!.id, 'Completed')} 
                  className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all group ${currentDecision === 'Completed' ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-white border-gray-100 hover:border-green-200 text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentDecision === 'Completed' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600'}`}>
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="font-bold text-lg">نعم، تم التنفيذ</span>
                  </div>
                  {currentDecision === 'Completed' && <CheckCircle2 size={24} className="text-green-500" />}
                </button>

                <button 
                  onClick={() => toggleDecision(currentTask!.id, 'Pending')} 
                  className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all group ${currentDecision === 'Pending' ? 'bg-red-50 border-red-500 text-red-700 shadow-md' : 'bg-white border-gray-100 hover:border-green-200 text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentDecision === 'Pending' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-red-100 group-hover:text-red-600'}`}>
                      <XCircle size={20} />
                    </div>
                    <span className="font-bold text-lg">لا، لم يتم التنفيذ</span>
                  </div>
                  {currentDecision === 'Pending' && <XCircle size={24} className="text-red-500" />}
                </button>

                <button 
                  onClick={() => toggleDecision(currentTask!.id, 'NotApplicable')} 
                  className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all group ${currentDecision === 'NotApplicable' ? 'bg-gray-100 border-gray-400 text-gray-700 shadow-md' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentDecision === 'NotApplicable' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'}`}>
                      <MinusCircle size={20} />
                    </div>
                    <span className="font-bold text-lg">لا تنطبق اليوم</span>
                  </div>
                </button>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 border-t border-gray-50 pt-6">
                <button 
                  disabled={currentTaskIndex === 0}
                  onClick={() => setCurrentTaskIndex(prev => prev - 1)}
                  className={`flex items-center gap-2 text-sm font-bold ${currentTaskIndex === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-indigo-600'}`}
                >
                  <ChevronRight size={18} /> السابقة
                </button>
                
                {currentTaskIndex === empAssignments.length - 1 ? (
                  <button 
                    onClick={handleRoutineFinished}
                    disabled={!currentDecision}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    إنهاء الروتين
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentTaskIndex(prev => prev + 1)}
                    disabled={!currentDecision}
                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-30"
                  >
                    التالية <ChevronLeft size={18} />
                  </button>
                )}
              </div>
           </div>
         ) : (
           <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-gray-300">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
              <p className="text-gray-500 font-bold">لا توجد مهام روتينية معينة لك حالياً.</p>
              <button onClick={() => setStep('extra-tasks')} className="mt-6 text-indigo-600 font-bold underline">الانتقال للمهام الإضافية</button>
           </div>
         )}
      </div>
    );
  }

  // Extra Tasks View (Final Step)
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
       <div className="mb-8">
          <button onClick={() => setStep('process-tasks')} className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-2 hover:text-indigo-600 transition-colors"><ChevronRight size={14} /> العودة للمهام الروتينية</button>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={24} /> مهام إضافية
          </h2>
          <p className="text-gray-500 text-sm">هل قمت بأعمال أخرى خارج نطاق الروتين اليومي؟</p>
       </div>

       <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-6">
          <div className="flex gap-2 mb-6">
             <input 
              type="text" 
              placeholder="وصف المهمة الإضافية..." 
              className="flex-1 border border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
              value={newExtraTask} 
              onChange={(e) => setNewExtraTask(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && addExtraTask()} 
             />
             <button onClick={addExtraTask} className="bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"><Plus size={24} /></button>
          </div>

          <div className="space-y-3">
              {extraTasks.length > 0 ? extraTasks.map((t, idx) => (
                 <div key={idx} className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 group">
                    <span className="text-gray-800 font-bold text-sm">{t.description}</span>
                    <button onClick={() => setExtraTasks(extraTasks.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors"><XCircle size={18} /></button>
                 </div>
              )) : (
                <div className="text-center py-6 text-gray-300 text-xs italic">لا توجد مهام إضافية مضافة بعد.</div>
              )}
          </div>
       </div>

       <button onClick={handleFinalSubmit} className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-3">
         <Save size={24} /> حفظ وإرسال تقرير اليوم
       </button>
    </div>
  );
};

export default DailyLogger;

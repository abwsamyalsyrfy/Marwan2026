
import React, { useState, useMemo } from 'react';
import { Employee, Task, Assignment, TaskLog } from '../types';
import { CheckCircle2, XCircle, ArrowLeft, Save, MinusCircle, Plus, CalendarOff, AlertTriangle, Calendar } from 'lucide-react';

interface DailyLoggerProps {
  currentUser: Employee; // Logged in user
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  onSaveLogs: (newLogs: TaskLog[]) => void;
  onCancel: () => void;
}

const DailyLogger: React.FC<DailyLoggerProps> = ({ currentUser, tasks, assignments, logs, onSaveLogs, onCancel }) => {
  // Directly start at processing tasks, no user selection needed
  const [step, setStep] = useState<'process-tasks' | 'extra-tasks' | 'register-leave'>('process-tasks');
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskDecisions, setTaskDecisions] = useState<Record<string, 'Completed' | 'Pending' | 'NotApplicable'>>({});
  const [extraTasks, setExtraTasks] = useState<{description: string}[]>([]);
  const [newExtraTask, setNewExtraTask] = useState('');
  const [leaveType, setLeaveType] = useState('Weekly');

  // Check existing logs for current user
  const hasExistingLogs = useMemo(() => {
    return logs.some(l => l.employeeId === currentUser.id && l.logDate.startsWith(selectedDate));
  }, [logs, currentUser.id, selectedDate]);

  const toggleDecision = (taskId: string, status: 'Completed' | 'Pending' | 'NotApplicable') => {
    setTaskDecisions(prev => ({
      ...prev,
      [taskId]: status
    }));
  };

  const handleRoutineFinished = () => {
    const empAssignments = assignments.filter(a => a.employeeId === currentUser.id);
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

  const removeExtraTask = (index: number) => {
    const updated = [...extraTasks];
    updated.splice(index, 1);
    setExtraTasks(updated);
  }

  const getLogDateISO = () => {
    const targetDate = new Date(selectedDate);
    const now = new Date();
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return targetDate.toISOString();
  }

  const handleFinalSubmit = () => {
    const empAssignments = assignments.filter(a => a.employeeId === currentUser.id);
    const logDateISO = getLogDateISO();
    
    const routineLogs: TaskLog[] = empAssignments.map(assignment => {
      const taskDef = tasks.find(t => t.id === assignment.taskId);
      return {
        id: Date.now().toString() + Math.random().toString(),
        logDate: logDateISO,
        employeeId: currentUser.id,
        taskId: assignment.taskId,
        taskType: 'Daily',
        status: taskDecisions[assignment.taskId],
        description: taskDef ? taskDef.description : 'Unknown Task',
        approvalStatus: 'PendingApproval' // Default status
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
      approvalStatus: 'PendingApproval' // Default status
    }));

    onSaveLogs([...routineLogs, ...extraLogs]);
  };

  const handleLeaveSubmit = () => {
    let leaveDescription = "إجازة";
    if (leaveType === 'Weekly') leaveDescription = "عطلة أسبوعية (خميس/جمعة)";
    if (leaveType === 'Official') leaveDescription = "إجازة رسمية / مناسبة";
    if (leaveType === 'Annual') leaveDescription = "إجازة سنوية / رصيد";
    if (leaveType === 'Sick') leaveDescription = "إجازة مرضية";

    const leaveLog: TaskLog = {
      id: `LEAVE-${Date.now()}`,
      logDate: getLogDateISO(),
      employeeId: currentUser.id,
      taskId: 'LEAVE',
      taskType: 'Daily',
      status: 'Leave',
      description: leaveDescription,
      approvalStatus: 'PendingApproval'
    };

    onSaveLogs([leaveLog]);
  };

  // --- BLOCKER: If Logs Exist ---
  if (hasExistingLogs) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in mt-10">
        <div className="bg-green-50 p-8 rounded-2xl shadow-lg border border-green-200 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">تم الإرسال بنجاح</h2>
            <p className="text-green-700 mb-6">
               لقد قمت بإرسال تقريرك اليومي لهذا التاريخ ({selectedDate}). هو الآن قيد المراجعة من قبل المسؤول.
            </p>
            <button 
               onClick={onCancel}
               className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
             >
               العودة للرئيسية
             </button>
        </div>
      </div>
    );
  }

  // --- Register Leave ---
  if (step === 'register-leave') {
    return (
      <div className="max-w-xl mx-auto animate-fade-in mt-10">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-orange-200">
           <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarOff size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">تسجيل إجازة / عطلة</h2>
              <p className="text-gray-500">التاريخ: <span className="font-bold text-gray-800" dir="ltr">{selectedDate}</span></p>
           </div>
           <div className="mb-6">
             <label className="block text-sm font-bold text-gray-700 mb-2">نوع الإجازة</label>
             <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
               <option value="Weekly">عطلة أسبوعية (خميس / جمعة)</option>
               <option value="Official">إجازة رسمية</option>
               <option value="Annual">إجازة سنوية</option>
               <option value="Sick">إجازة مرضية</option>
             </select>
           </div>
           <div className="flex gap-3">
             <button onClick={() => setStep('process-tasks')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">إلغاء</button>
             <button onClick={handleLeaveSubmit} className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700">تأكيد الإجازة</button>
           </div>
        </div>
      </div>
    )
  }

  // --- Routine Tasks ---
  if (step === 'process-tasks') {
    const empAssignments = assignments.filter(a => a.employeeId === currentUser.id);
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
         <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">أهلاً، {currentUser.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-gray-500">تسجيل المهام ليوم:</p>
                 <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-white border rounded px-2 text-sm font-bold" />
              </div>
            </div>
            <button onClick={() => setStep('register-leave')} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm font-bold">
              <CalendarOff size={16} /> تسجيل إجازة
            </button>
         </div>
         <div className="space-y-4 mb-8">
           {empAssignments.map(assignment => {
             const task = tasks.find(t => t.id === assignment.taskId);
             if (!task) return null;
             const currentDecision = taskDecisions[assignment.taskId];
             return (
               <div key={assignment.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">{task.description}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => toggleDecision(task.id, 'Completed')} className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${currentDecision === 'Completed' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-green-50/50'}`}><CheckCircle2 size={20} /><span className="text-sm">منفذة</span></button>
                    <button onClick={() => toggleDecision(task.id, 'Pending')} className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${currentDecision === 'Pending' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-red-50/50'}`}><XCircle size={20} /><span className="text-sm">غير منفذة</span></button>
                    <button onClick={() => toggleDecision(task.id, 'NotApplicable')} className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${currentDecision === 'NotApplicable' ? 'bg-gray-100 border-gray-400 text-gray-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}><MinusCircle size={20} /><span className="text-sm">لا تنطبق</span></button>
                  </div>
               </div>
             );
           })}
           {empAssignments.length === 0 && <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg"><AlertTriangle size={32} className="mx-auto mb-2" /><p>لا توجد مهام روتينية معينة لك.</p></div>}
         </div>
         <button onClick={handleRoutineFinished} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">التالي: مهام إضافية</button>
      </div>
    );
  }

  // --- Extra Tasks ---
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
       <div className="mb-6">
          <button onClick={() => setStep('process-tasks')} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-2"><ArrowLeft size={16} /> عودة</button>
          <h2 className="text-2xl font-bold text-gray-900">مهام إضافية</h2>
          <p className="text-gray-500">هل قمت بأي مهام أخرى اليوم؟</p>
       </div>
       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="flex gap-2 mb-4">
             <input type="text" placeholder="وصف المهمة..." className="flex-1 border border-gray-300 rounded-lg px-4 py-3" value={newExtraTask} onChange={(e) => setNewExtraTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExtraTask()} />
             <button onClick={addExtraTask} className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700"><Plus size={24} /></button>
          </div>
          <ul className="space-y-2">
              {extraTasks.map((t, idx) => (
                 <li key={idx} className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <span className="text-indigo-900 font-medium">{t.description}</span>
                    <button onClick={() => removeExtraTask(idx)} className="text-red-500 hover:text-red-700"><XCircle size={18} /></button>
                 </li>
              ))}
          </ul>
       </div>
       <button onClick={handleFinalSubmit} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"><Save size={24} /> إرسال التقرير للمراجعة</button>
    </div>
  );
};

export default DailyLogger;

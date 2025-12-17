import React from 'react';
import { RoutineTask } from '../types';
import { ArrowLeft, Clock, CheckCircle, FileCode, Wrench } from 'lucide-react';

interface TaskDetailsProps {
  task: RoutineTask;
  onBack: () => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ task, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} className="ml-2" />
        العودة للوحة المعلومات
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h2>
            <p className="text-gray-500">{task.description}</p>
          </div>
          <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
            {task.frequency}
          </span>
        </div>

        {task.analysis && (
          <div className="mt-8 border-t border-gray-100 pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">خطة الأتمتة</h3>
            <div className="grid grid-cols-1 gap-6">
              {task.analysis.steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary font-bold shadow-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                         <h4 className="font-bold text-gray-900">{step.title}</h4>
                         {step.tool && (
                             <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600 flex items-center gap-1">
                                 <Wrench size={10} /> {step.tool}
                             </span>
                         )}
                     </div>
                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                    {step.codeSnippet && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <FileCode size={14} />
                            <span>مقتطف برمجي / قالب</span>
                        </div>
                        <div className="bg-gray-800 text-gray-300 p-3 rounded-lg text-sm font-mono overflow-x-auto" dir="ltr">
                          <pre>{step.codeSnippet}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;

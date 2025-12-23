
import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Clock, Zap, Target, FileText, CheckCircle2, ChevronLeft, Upload, Image as ImageIcon, Wrench, FileCode } from 'lucide-react';
import { analyzeTaskWithGemini } from '../services/geminiService';
import { TaskAnalysis } from '../types';

const AutomationAssistant: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [attachment, setAttachment] = useState<{ base64: string; mimeType: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachment({ base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeTaskWithGemini(title, description, frequency, attachment || undefined);
      setAnalysis(result);
    } catch (err) {
      alert('عذراً، حدث خطأ أثناء التحليل. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مساعد أتمتة المهام</h2>
          <p className="text-gray-500">حول مهامك الروتينية اليدوية إلى عمليات ذكية مدعومة بالذكاء الاصطناعي</p>
        </div>
      </div>

      {!analysis ? (
        <form onSubmit={handleAnalyze} className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">عنوان المهمة</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثلاً: إعداد تقرير المصروفات الأسبوعي"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">تكرار المهمة</label>
                <select 
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Daily">يومياً</option>
                  <option value="Weekly">أسبوعياً</option>
                  <option value="Monthly">شهرياً</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 mr-1">وصف المهمة بالتفصيل</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="اشرح الخطوات اليدوية التي تقوم بها، والملفات التي تستخدمها، والوقت المستغرق..."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 mr-1">إرفاق صورة للمهمة (اختياري)</label>
              <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {attachment ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                    <CheckCircle2 size={24} /> تم إرفاق الصورة بنجاح
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-indigo-400">
                    <ImageIcon size={40} />
                    <span className="text-sm font-medium">أرفق لقطة شاشة للجدول أو النظام الذي تستخدمه لتسهيل التحليل</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              disabled={isAnalyzing || !title || !description}
              className={`flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-200 ${isAnalyzing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95'}`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري تحليل المهمة بعناية...
                </>
              ) : (
                <>
                  <Send size={20} />
                  بدء التحليل واقتراح الحل
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-8 animate-slide-up">
          <div className="flex items-center justify-between">
            <button 
                onClick={() => setAnalysis(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
            >
                <ChevronLeft size={20} />
                عودة للتحليل
            </button>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 size={14} /> تحليل مكتمل بواسطة Gemini AI
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
               <div className="relative z-10">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest mb-4 inline-block">الرؤية الاستراتيجية</span>
                  <h3 className="text-3xl font-black mb-4">{title}</h3>
                  <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl">{analysis.summary}</p>
               </div>
            </div>

            <div className="p-10 space-y-10">
               <div>
                  <h4 className="text-gray-900 font-black text-xl mb-6 flex items-center gap-3">
                    <Zap className="text-amber-500" fill="currentColor" /> خطوات التنفيذ المقترحة
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {analysis.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 group hover:border-indigo-200 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xl shrink-0 border border-gray-100">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                           <div className="flex flex-wrap items-center gap-3">
                               <h5 className="font-black text-gray-900 text-lg">{step.title}</h5>
                               {step.tool && (
                                   <span className="text-[10px] bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black flex items-center gap-1 uppercase">
                                       <Wrench size={10} /> {step.tool}
                                   </span>
                               )}
                           </div>
                           <p className="text-gray-600 leading-relaxed font-medium">{step.description}</p>
                           {step.codeSnippet && (
                             <div className="mt-4">
                               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-2 uppercase">
                                   <FileCode size={14} /> قالب برمجي مقترح
                               </div>
                               <div className="bg-slate-900 text-indigo-300 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-inner border border-white/5" dir="ltr">
                                 <pre>{step.codeSnippet}</pre>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <Target size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-indigo-900 mb-1">النتيجة المتوقعة</h5>
                    <p className="text-indigo-700 text-sm">تطبيق هذه الخطوات سيقلل من الوقت المستغرق في هذه المهمة بنسبة تزيد عن 70% ويعزز من دقة البيانات المرحلة للنظام.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationAssistant;

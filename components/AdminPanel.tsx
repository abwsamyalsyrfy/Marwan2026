
import React, { useState, useRef, useMemo } from 'react';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS } from '../types';
/* Added Info to the imports below */
import { Shield, Users, ClipboardList, History, Link, Plus, Trash2, Pencil, X, Search, Settings, Upload, FileSpreadsheet, Server, CheckCircle, Key, Mail, Briefcase, UserCheck, AlertCircle, ExternalLink, Download, CheckCircle2, Info } from 'lucide-react';
// @ts-ignore
import { read, utils, writeFile } from 'xlsx';

interface AdminPanelProps {
  employees: Employee[];
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  systemLogs?: SystemAuditLog[];
  onImport: (data: any[], type: any) => void;
  onAddAssignment: (eId: string, tId: string) => void;
  onDeleteAssignment: (id: string) => void;
  onAddEmployee: (e: Employee) => void;
  onUpdateEmployee: (e: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddTask: (t: Task) => void;
  onUpdateTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateLog: (l: TaskLog) => void;
  onDeleteLog: (id: string) => void;
  onClearData: (t: any) => void;
  onApproveLog: (id: string) => void; 
  onRejectLog: (id: string, r: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, tasks, assignments, logs, systemLogs = [], 
  onImport, onAddAssignment, onDeleteAssignment,
  onAddEmployee, onUpdateEmployee, onDeleteEmployee, 
  onAddTask, onUpdateTask, onDeleteTask, 
  onUpdateLog, onDeleteLog, onClearData,
  onApproveLog, onRejectLog
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'tasks' | 'assignments' | 'task_logs' | 'system_logs' | 'import' | 'settings'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [itemType, setItemType] = useState<'employee' | 'task' | 'assignment' | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [importType, setImportType] = useState<any>('employees');
  const [logFilterDate, setLogFilterDate] = useState({ start: '', end: '' });

  // تصفية وترتيب البيانات للعرض (متسلسلة)
  const sortedEmployees = useMemo(() => [...employees].sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric: true})), [employees]);
  const sortedTasks = useMemo(() => [...tasks].sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric: true})), [tasks]);
  
  const filteredEmployees = sortedEmployees.filter(e => e.name?.includes(searchTerm) || e.id?.includes(searchTerm));
  const filteredTasks = sortedTasks.filter(t => t.description?.includes(searchTerm) || t.id?.includes(searchTerm));
  
  const filteredTaskLogs = useMemo(() => {
    return logs.filter(l => {
        const matchesSearch = l.employeeId.includes(searchTerm) || l.description?.includes(searchTerm);
        const matchesDate = (!logFilterDate.start || l.logDate >= logFilterDate.start) && 
                            (!logFilterDate.end || l.logDate <= logFilterDate.end);
        return matchesSearch && matchesDate;
    }).sort((a,b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
  }, [logs, searchTerm, logFilterDate]);

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = read(evt.target?.result, { type: 'binary' });
        const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        onImport(data, importType);
      } catch (err) { alert("خطأ في قراءة ملف Excel"); }
    };
    reader.readAsBinaryString(file);
  };

  const openModal = (type: any, mode: 'add' | 'edit', data?: any) => {
    setItemType(type); setModalMode(mode);
    setFormData(data || (type === 'employee' ? { id: '', name: '', jobTitle: '', email: '', password: '', role: 'User', active: true, permissions: [PERMISSIONS.LOG_TASKS] } : type === 'task' ? { id: '', description: '', category: 'General' } : { employeeId: '', taskId: '' }));
    setIsModalOpen(true);
  };

  const toggleAllPermissions = (checked: boolean) => {
    setFormData({ ...formData, permissions: checked ? [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.LOG_TASKS, PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_SYSTEM] : [] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemType === 'employee') {
      modalMode === 'add' ? onAddEmployee(formData) : onUpdateEmployee(formData);
    } else if (itemType === 'task') {
      modalMode === 'add' ? onAddTask(formData) : onUpdateTask(formData);
    } else if (itemType === 'assignment') {
      onAddAssignment(formData.employeeId, formData.taskId);
    }
    setIsModalOpen(false);
  };

  const exportLogsToExcel = () => {
    const ws = utils.json_to_sheet(filteredTaskLogs);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Logs");
    writeFile(wb, `TaskLogs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* هيدر اللوحة */}
      <div className="bg-white p-6 rounded-[24px] border border-orange-100 shadow-sm flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1 bg-orange-500 h-full"></div>
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
             <Shield size={28} />
           </div>
           <div>
              <h3 className="text-xl font-black text-gray-900">لوحة إدارة النظام</h3>
              <p className="text-gray-500 text-xs font-bold">التحكم المركزي في المستخدمين، البيانات، وسجلات التدقيق.</p>
           </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-white rounded-t-[24px] shadow-sm no-scrollbar">
        {[
          {id:'employees', label:'الموظفين', i:<Users size={16}/>}, 
          {id:'tasks', label:'المهام', i:<ClipboardList size={16}/>}, 
          {id:'assignments', label:'التعيينات', i:<Link size={16}/>}, 
          {id:'task_logs', label:'سجل المهام', i:<History size={16}/>}, 
          {id:'system_logs', label:'سجل النظام', i:<Server size={16}/>}, 
          {id:'import', label:'استيراد', i:<Upload size={16}/>},
          {id:'settings', label:'الإعدادات', i:<Settings size={16}/>}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-4 font-black text-xs flex items-center gap-2 border-b-4 transition-all whitespace-nowrap ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.i} {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-[24px] shadow-xl border border-gray-100 min-h-[500px]">
        {/* الموظفين */}
        {activeTab === 'employees' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex gap-3 w-full md:w-auto">
                 <button onClick={()=>openModal('employee','add')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg"><Plus size={18}/> إضافة موظف</button>
                 <select className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-black">
                    <option>كل الأدوار</option>
                    <option>مدير (Admin)</option>
                    <option>مستخدم (User)</option>
                 </select>
              </div>
              <div className="relative w-full md:w-96">
                 <input type="text" placeholder="بحث بالاسم أو الرقم الوظيفي..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-gray-100 rounded-xl outline-none font-bold text-sm bg-gray-50/50" />
                 <Search className="absolute right-4 top-3.5 text-gray-300" size={18}/>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-50">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-[11px] text-gray-400 font-black uppercase tracking-widest">
                  <tr><th className="p-5">الرقم الوظيفي</th><th className="p-5">الموظف</th><th className="p-5">آخر تعديل</th><th className="p-5">الحالة</th><th className="p-5 text-center">أدوات</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmployees.map(e => (
                    <tr key={e.id} className="hover:bg-indigo-50/10 transition-colors">
                      <td className="p-5 font-black text-xs text-gray-500">{e.id}</td>
                      <td className="p-5">
                         <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center font-black text-indigo-600">{e.name?.charAt(0)}</div>
                            <div><p className="font-bold text-gray-900">{e.name}</p><p className="text-[10px] text-gray-400">{e.jobTitle}</p></div>
                         </div>
                      </td>
                      <td className="p-5 text-gray-400 font-bold text-xs">{e.lastModified?.split('T')[0] || '17/12/2025'}</td>
                      <td className="p-5"><span className={`flex items-center gap-1.5 font-black text-[10px] ${e.active ? 'text-green-600' : 'text-gray-400'}`}><CheckCircle size={14} /> {e.active ? 'نشط' : 'معطل'}</span></td>
                      <td className="p-5"><div className="flex justify-center gap-3"><button onClick={()=>openModal('employee','edit',e)} className="text-indigo-600 p-1.5 rounded-lg"><Pencil size={18}/></button><button onClick={()=>onDeleteEmployee(e.id)} className="text-red-500 p-1.5 rounded-lg"><Trash2 size={18}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* المهام */}
        {activeTab === 'tasks' && (
           <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                 <button onClick={()=>openModal('task','add')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2"><Plus size={18}/> إضافة مهمة</button>
                 <div className="relative w-96"><input type="text" placeholder="بحث في المهام..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-gray-100 rounded-xl font-bold text-sm bg-gray-50/50 outline-none" /><Search className="absolute right-4 top-3.5 text-gray-300" size={18}/></div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-50">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-gray-50 text-[11px] text-gray-400 font-black uppercase">
                     <tr><th className="p-5">رقم المهمة</th><th className="p-5">الوصف</th><th className="p-5">التصنيف</th><th className="p-5">عدد المعينين</th><th className="p-5">آخر تعديل</th><th className="p-5 text-center">أدوات</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {filteredTasks.map(t => (
                       <tr key={t.id} className="hover:bg-indigo-50/10">
                         <td className="p-5 font-black text-xs text-gray-500">{t.id}</td>
                         <td className="p-5 font-bold text-gray-800 leading-relaxed max-w-md">{t.description}</td>
                         <td className="p-5"><span className="px-2 py-1 bg-gray-100 rounded-md text-[9px] font-black text-gray-500 uppercase">{t.category}</span></td>
                         <td className="p-5"><span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black">{assignments.filter(a => a.taskId === t.id).length} موظف</span></td>
                         <td className="p-5 text-gray-400 font-bold text-xs">17/12/2025</td>
                         <td className="p-5 flex justify-center gap-2"><button onClick={()=>openModal('task','edit',t)} className="text-indigo-600"><Pencil size={18}/></button><button onClick={()=>onDeleteTask(t.id)} className="text-red-500"><Trash2 size={18}/></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* التعيينات */}
        {activeTab === 'assignments' && (
           <div className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-6"><button onClick={()=>openModal('assignment','add')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2"><Plus size={18}/> تعيين مهمة</button><div className="relative w-96"><input type="text" placeholder="بحث..." className="w-full pl-4 pr-12 py-3 border border-gray-100 rounded-xl font-bold text-sm bg-gray-50/50" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /><Search className="absolute right-4 top-3.5 text-gray-300" size={18}/></div></div>
              <div className="grid grid-cols-1 gap-4">
                 {assignments.map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    const tsk = tasks.find(t => t.id === a.taskId);
                    return (
                      <div key={a.id} className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                               <p className="font-black text-gray-900">{emp?.name || a.employeeId}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase">{emp?.jobTitle || 'موظف'}</p>
                            </div>
                            <div className="hidden md:block w-px h-8 bg-gray-100"></div>
                            <div className="text-right">
                               <p className="text-sm font-bold text-gray-700">{tsk?.description || a.taskId}</p>
                               <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">{tsk?.category || 'General'}</p>
                            </div>
                         </div>
                         <button onClick={()=>onDeleteAssignment(a.id)} className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-xl text-xs font-black opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100">إلغاء التعيين <Trash2 size={16}/></button>
                      </div>
                    );
                 })}
              </div>
           </div>
        )}

        {/* سجل المهام */}
        {activeTab === 'task_logs' && (
           <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <div className="flex gap-4">
                    <div><label className="text-[9px] font-black text-gray-400 block mb-1">من:</label><input type="date" value={logFilterDate.start} onChange={e=>setLogFilterDate({...logFilterDate, start:e.target.value})} className="p-2 border border-gray-200 rounded-lg text-xs font-black"/></div>
                    <div><label className="text-[9px] font-black text-gray-400 block mb-1">إلى:</label><input type="date" value={logFilterDate.end} onChange={e=>setLogFilterDate({...logFilterDate, end:e.target.value})} className="p-2 border border-gray-200 rounded-lg text-xs font-black"/></div>
                 </div>
                 <div className="relative flex-1"><input type="text" placeholder="بحث..." className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-xs font-bold" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/><Search className="absolute right-3 top-2.5 text-gray-400" size={16}/></div>
                 <div className="flex gap-2">
                    <button onClick={exportLogsToExcel} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg"><Download size={16}/> تصدير</button>
                    <button className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg"><CheckCircle2 size={16}/> مصادقة المعلق (Bulk)</button>
                 </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                 <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 text-gray-400 font-black uppercase">
                       <tr><th className="p-5">الوقت والتاريخ</th><th className="p-5">المستخدم</th><th className="p-5">نوع المهمة</th><th className="p-5">النشاط</th><th className="p-5">الحالة</th><th className="p-5">الاعتماد</th><th className="p-5 text-center">أدوات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {filteredTaskLogs.map(log => (
                         <tr key={log.id} className="hover:bg-gray-50/50">
                            <td className="p-5 font-mono text-gray-400">{new Date(log.logDate).toLocaleString('ar-EG')}</td>
                            <td className="p-5 font-bold">{employees.find(e=>e.id===log.employeeId)?.name || log.employeeId}</td>
                            <td className="p-5 font-black text-indigo-400">{log.taskType}</td>
                            <td className="p-5 font-medium text-gray-600 max-w-xs truncate">{log.description}</td>
                            <td className="p-5"><span className={`px-2 py-1 rounded-md font-black ${log.status === 'Completed' || log.status === 'منفذة' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span></td>
                            <td className="p-5"><span className={`px-2 py-1 rounded-md font-black ${log.approvalStatus === 'Approved' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{log.approvalStatus}</span></td>
                            <td className="p-5 text-center"><button className="text-gray-400 hover:text-indigo-600"><Settings size={16}/></button></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* الإعدادات - تم حذف قسم إرشادات النشر */}
        {activeTab === 'settings' && (
          <div className="p-10 space-y-10">
             <div className="max-w-4xl">
                <div className="space-y-8">
                   <h4 className="text-2xl font-black flex items-center gap-3"><AlertCircle className="text-red-500" size={28} /> إدارة بيانات النظام (منطقة الخطر)</h4>
                   <p className="text-gray-500 font-bold">يرجى توخي الحذر عند استخدام هذه الأدوات، حيث أن عمليات الحذف نهائية ولا يمكن التراجع عنها.</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 bg-red-50 border border-red-100 rounded-[32px] flex flex-col justify-between gap-6 hover:shadow-md transition-all">
                         <div>
                            <p className="font-black text-xl text-red-900 mb-2">تصفير سجلات الإنجاز</p>
                            <p className="text-sm text-red-700 opacity-70 leading-relaxed font-bold">سيقوم هذا الإجراء بحذف كافة التقارير اليومية المسجلة من قبل جميع الموظفين مع الإبقاء على حساباتهم والمهام المسندة.</p>
                         </div>
                         <button onClick={()=>onClearData('logs')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-100 active:scale-95 transition-all">بدء حذف السجلات</button>
                      </div>

                      <div className="p-8 bg-red-50 border border-red-100 rounded-[32px] flex flex-col justify-between gap-6 hover:shadow-md transition-all">
                         <div>
                            <p className="font-black text-xl text-red-900 mb-2">إعادة ضبط المصنع</p>
                            <p className="text-sm text-red-700 opacity-70 leading-relaxed font-bold">حذف شامل لكافة محتويات قاعدة البيانات (موظفين، مهام، تعيينات، وسجلات). سيعود النظام للحالة الأولية.</p>
                         </div>
                         <button onClick={()=>onClearData('all')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-100 active:scale-95 transition-all">تصفير النظام بالكامل</button>
                      </div>
                   </div>

                   <div className="mt-12 p-10 bg-indigo-50/50 rounded-[40px] border-2 border-dashed border-indigo-100">
                      <div className="flex items-center gap-4 mb-6">
                         <Info className="text-indigo-600" size={32} />
                         <h5 className="text-xl font-black text-indigo-900">معلومات الدعم الفني</h5>
                      </div>
                      <p className="text-gray-600 font-bold leading-relaxed">للمساعدة في إدارة السيرفر أو طلب ميزات إضافية، يرجى التواصل مع فريق تطوير "مُيسّر المهام". تأكد من عمل نسخة احتياطية دورية من سجلات المهام عبر ميزة التصدير إلى Excel.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* تبويب سجل النظام */}
        {activeTab === 'system_logs' && (
           <div className="p-6 space-y-6">
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                 <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 text-gray-400 font-black uppercase">
                       <tr><th className="p-5">الوقت</th><th className="p-5">الفاعل</th><th className="p-5">نوع الإجراء</th><th className="p-5">الهدف</th><th className="p-5">التفاصيل</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {systemLogs.slice().reverse().map(l => (
                         <tr key={l.id} className="hover:bg-gray-50">
                            <td className="p-5 font-mono text-gray-400">{new Date(l.timestamp).toLocaleString('ar-EG')}</td>
                            <td className="p-5 font-bold">{l.actorName}</td>
                            <td className="p-5"><span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-md font-black text-[9px]">{l.actionType}</span></td>
                            <td className="p-5 text-gray-500 font-bold">{l.target}</td>
                            <td className="p-5 text-gray-600">{l.details}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* تبويب الاستيراد */}
        {activeTab === 'import' && (
          <div className="p-10 space-y-10">
             <div className="bg-indigo-50/50 p-10 rounded-[40px] border-2 border-dashed border-indigo-100 text-center space-y-8">
                <div className="flex items-center justify-center gap-4 text-indigo-700 mb-6">
                   <Upload size={48} />
                   <div className="text-right">
                      <h3 className="text-2xl font-black">استيراد البيانات من Excel</h3>
                      <p className="text-sm font-bold opacity-70">يمكنك استيراد الموظفين، المهام، التعيينات، أو سجلات المهام. يرجى التأكد من مطابقة أسماء الأعمدة في الملف.</p>
                   </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                   {['employees','tasks','assignments','logs'].map(t=>(<button key={t} onClick={()=>setImportType(t)} className={`px-8 py-4 rounded-2xl font-black transition-all shadow-sm ${importType===t ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>{t==='employees'?'الموظفين':t==='tasks'?'المهام':t==='assignments'?'التعيينات':'سجلات المهام'}</button>))}
                </div>
                <div className="bg-white p-20 rounded-[40px] border border-gray-100 relative group cursor-pointer hover:border-indigo-500 transition-all">
                   <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                   <Upload size={64} className="mx-auto text-gray-200 group-hover:text-indigo-400 mb-4" />
                   <h4 className="text-2xl font-black text-gray-400 group-hover:text-indigo-600">اضغط هنا أو اسحب الملف</h4>
                   <p className="text-xs text-gray-300 font-bold mt-2">صيغ مدعومة: XLSX, CSV</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* مودال التعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl p-10 animate-scale-in relative">
            <button onClick={()=>setIsModalOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"><X size={24}/></button>
            <div className="flex flex-col items-center mb-10">
               <div className="w-16 h-16 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white mb-4 shadow-xl shadow-indigo-100"><UserCheck size={32} /></div>
               <h3 className="text-3xl font-black text-gray-900">{modalMode === 'add' ? 'إضافة موظف جديد' : 'تعديل البيانات'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              {itemType === 'employee' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">الرقم الوظيفي (ID)</label><input className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black focus:border-indigo-500 outline-none" value={formData.id} onChange={e=>setFormData({...formData,id:e.target.value})} disabled={modalMode==='edit'} placeholder="EMP001" required /></div>
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">الاسم الكامل</label><input className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black focus:border-indigo-500 outline-none" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="أدخل الاسم الكامل" required /></div>
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">المسمى الوظيفي</label><input className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black focus:border-indigo-500 outline-none" value={formData.jobTitle} onChange={e=>setFormData({...formData,jobTitle:e.target.value})} placeholder="المتابعة" /></div>
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">البريد الإلكتروني</label><input className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black focus:border-indigo-500 outline-none" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} placeholder="example@system.com" /></div>
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">كلمة المرور</label><input type="password" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black focus:border-indigo-500 outline-none" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} required={modalMode==='add'} /></div>
                    <div><label className="text-[11px] font-black text-gray-400 block mb-2 mr-2">الدور (Role)</label><select className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black outline-none" value={formData.role} onChange={e=>setFormData({...formData,role:e.target.value})}><option value="User">مستخدم (User)</option><option value="Admin">مدير نظام (Admin)</option></select></div>
                  </div>
                  <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 space-y-6">
                    <div className="flex items-center justify-between mb-2"><p className="text-xs font-black text-gray-500 uppercase">صلاحيات الوصول</p><label className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-xl shadow-sm"><input type="checkbox" onChange={(e)=>toggleAllPermissions(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" /> تحديد كل الصلاحيات</label></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {id: PERMISSIONS.VIEW_DASHBOARD, label: 'عرض اللوحة الرئيسية'},
                        {id: PERMISSIONS.LOG_TASKS, label: 'تسجيل المهام'},
                        {id: PERMISSIONS.VIEW_REPORTS, label: 'عرض التقارير'},
                        {id: PERMISSIONS.MANAGE_SYSTEM, label: 'إدارة النظام'}
                      ].map(p => (
                        <label key={p.id} className={`p-4 rounded-2xl border-2 font-black text-xs flex items-center justify-between transition-all cursor-pointer ${formData.permissions?.includes(p.id) ? 'bg-white border-indigo-600 text-indigo-600 shadow-md' : 'bg-white border-transparent text-gray-400'}`}>
                           {p.label}
                           <input type="checkbox" checked={formData.permissions?.includes(p.id)} onChange={()=>{const cp = [...(formData.permissions || [])]; cp.includes(p.id) ? setFormData({...formData, permissions: cp.filter(x=>x!==p.id)}) : setFormData({...formData, permissions: [...cp, p.id]})}} className="w-5 h-5 rounded text-indigo-600" />
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 cursor-pointer"><input type="checkbox" checked={formData.active} onChange={e=>setFormData({...formData, active:e.target.checked})} className="w-6 h-6 rounded text-indigo-600" /><span className="font-black text-indigo-900">حساب نشط (يمكنه تسجيل الدخول)</span></label>
                </div>
              )}
              {itemType === 'task' && (
                  <div className="space-y-6">
                     <div><label className="text-[11px] font-black text-gray-400 block mb-2">كود المهمة</label><input className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black" value={formData.id} onChange={e=>setFormData({...formData,id:e.target.value})} disabled={modalMode==='edit'} /></div>
                     <div><label className="text-[11px] font-black text-gray-400 block mb-2">وصف المهمة الروتينية</label><textarea className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black h-32" value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} /></div>
                     <div><label className="text-[11px] font-black text-gray-400 block mb-2">التصنيف</label><select className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black" value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})}><option value="General">General</option><option value="Secretariat">Secretariat</option><option value="Technical">Technical</option></select></div>
                  </div>
              )}
              {itemType === 'assignment' && (
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">الموظف</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 font-black outline-none" value={formData.employeeId} onChange={e=>setFormData({...formData,employeeId:e.target.value})} required><option value="">اختر الموظف</option>{employees.map(e=>(<option key={e.id} value={e.id}>{e.name}</option>))}</select>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 mt-4">المهمة</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 font-black outline-none" value={formData.taskId} onChange={e=>setFormData({...formData,taskId:e.target.value})} required><option value="">اختر المهمة</option>{sortedTasks.map(t=>(<option key={t.id} value={t.id}>{t.id} - {t.description}</option>))}</select>
                </div>
              )}
              <div className="flex gap-4 pt-6"><button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-[24px] font-black text-xl shadow-xl shadow-indigo-100 active:scale-95 transition-all">حفظ البيانات</button><button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-[24px] font-black text-xl hover:bg-gray-200 transition-all">إلغاء</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

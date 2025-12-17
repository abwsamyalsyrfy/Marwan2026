
import React, { useState, useRef } from 'react';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS } from '../types';
import { Database, Upload, Users, ClipboardList, FileDown, Check, History, Link, Plus, Trash2, Pencil, X, AlertTriangle, Shield, Key, Search, Calendar, Filter, Settings, AlertOctagon, RotateCcw, Lock, FileSpreadsheet, Server, Activity, UserCheck, UserX, CheckCircle, AlertCircle, CheckSquare, Globe } from 'lucide-react';
// @ts-ignore
import { read, utils, writeFile } from 'xlsx';

interface AdminPanelProps {
  employees: Employee[];
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  systemLogs?: SystemAuditLog[];
  onImport: (data: any[], type: 'employees' | 'tasks' | 'logs' | 'assignments') => void;
  onAddAssignment: (empId: string, taskId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateLog: (log: TaskLog) => void;
  onDeleteLog: (id: string) => void;
  onClearData: (type: 'logs' | 'employees' | 'all') => void;
  onApproveLog: (logId: string) => void; 
  onRejectLog: (logId: string, reason: string) => void;
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
  const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [empRoleFilter, setEmpRoleFilter] = useState<'All' | 'Admin' | 'User'>('All');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize dates safely
  const [logStartDate, setLogStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]); 
  const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [importType, setImportType] = useState<'employees' | 'tasks' | 'assignments' | 'logs'>('employees');
  const [showAllDates, setShowAllDates] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [itemType, setItemType] = useState<'employee' | 'task' | 'assignment' | null>(null);
  const [formData, setFormData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Filtering (Protected against undefined) ---
  const filteredEmployees = employees.filter(e => {
    const name = e.name || '';
    const id = e.id || '';
    const matchesSearch = name.includes(searchTerm) || id.includes(searchTerm);
    const matchesRole = empRoleFilter === 'All' ? true : e.role === empRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredTasks = tasks.filter(t => {
      const desc = t.description || '';
      const id = t.id || '';
      return desc.includes(searchTerm) || id.includes(searchTerm);
  });

  const filteredAssignments = assignments.filter(a => {
    const empName = employees.find(e => e.id === a.employeeId)?.name || '';
    const taskDesc = tasks.find(t => t.id === a.taskId)?.description || '';
    return empName.includes(searchTerm) || taskDesc.includes(searchTerm);
  });
  
  const filteredTaskLogs = logs.filter(l => {
    const desc = l.description || '';
    const empId = l.employeeId || '';
    const empName = employees.find(e => e.id === l.employeeId)?.name || '';
    
    // Search matching
    const matchesSearch = desc.includes(searchTerm) || empId.includes(searchTerm) || empName.includes(searchTerm);
    
    // Date matching (Robust)
    let matchesDate = true;
    if (!showAllDates) {
        try {
            // Normalize log date to YYYY-MM-DD for comparison
            const logDateObj = new Date(l.logDate);
            if (isNaN(logDateObj.getTime())) {
                matchesDate = false; // Invalid date in log
            } else {
                const logDateStr = logDateObj.toISOString().split('T')[0];
                matchesDate = logDateStr >= logStartDate && logDateStr <= logEndDate;
            }
        } catch (e) {
            matchesDate = false;
        }
    }

    return matchesSearch && matchesDate;
  }).sort((a,b) => new Date(b.logDate || 0).getTime() - new Date(a.logDate || 0).getTime());

  const filteredSystemLogs = systemLogs.filter(l => {
      const actor = l.actorName || '';
      const details = l.details || '';
      const action = l.actionType || '';
      const timestamp = l.timestamp || '';
      
      const matchesSearch = actor.includes(searchTerm) || details.includes(searchTerm) || action.includes(searchTerm);
      return matchesSearch; 
  }).sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  // --- Actions ---
  const handleBulkApprove = () => {
      const unapproved = filteredTaskLogs.filter(l => l.approvalStatus === 'PendingApproval');
      if (unapproved.length === 0) return;
      if (window.confirm(`هل أنت متأكد من المصادقة على ${unapproved.length} سجلات معلقة؟`)) {
          unapproved.forEach(log => onApproveLog(log.id));
      }
  };

  const handleSingleReject = (logId: string) => {
      const reason = window.prompt("الرجاء إدخال سبب الرفض:");
      if (reason !== null) {
         onRejectLog(logId, reason || "رفض من قبل المسؤول");
      }
  };

  // --- Excel Export (New) ---
  const handleExportExcel = () => {
      const exportData = filteredTaskLogs.map(log => {
          const emp = employees.find(e => e.id === log.employeeId);
          return {
              "التاريخ": new Date(log.logDate).toLocaleDateString('ar-EG'),
              "الوقت": new Date(log.logDate).toLocaleTimeString('ar-EG'),
              "رقم الموظف": log.employeeId,
              "اسم الموظف": emp?.name || 'غير معروف',
              "نوع المهمة": log.taskType === 'Daily' ? 'روتينية' : log.taskType === 'Extra' ? 'إضافية' : 'إجازة',
              "وصف المهمة": log.description,
              "الحالة": log.status === 'Completed' ? 'منفذة' : log.status === 'Pending' ? 'غير منفذة' : log.status === 'NotApplicable' ? 'لا تنطبق' : 'إجازة',
              "حالة الاعتماد": log.approvalStatus === 'Approved' ? 'معتمد' : log.approvalStatus === 'Rejected' ? 'مرفوض' : 'معلق',
              "ملاحظات": log.managerNote || ''
          };
      });

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "سجل المهام");
      writeFile(wb, `TaskLogs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- File Import Handler ---
  // Helper to normalize data keys from Excel (handles Case Sensitivity & Aliases)
  const processImportedData = (data: any[], type: string) => {
    const getValue = (row: any, key: string) => {
        const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase());
        return foundKey ? row[foundKey] : undefined;
    };

    return data.map(row => {
        if (type === 'employees') {
            return {
                id: String(getValue(row, 'id') || getValue(row, 'empid') || ''),
                name: getValue(row, 'name') || getValue(row, 'empname') || getValue(row, 'fullname') || '',
                jobTitle: getValue(row, 'jobtitle') || getValue(row, 'title') || '',
                email: getValue(row, 'email') || '',
                password: String(getValue(row, 'password') || '123456'),
                role: getValue(row, 'role') || 'User',
                active: getValue(row, 'active') === true || String(getValue(row, 'active')).toLowerCase() === 'true' || true,
                permissions: []
            } as Employee;
        }
        if (type === 'tasks') {
             return {
                id: String(getValue(row, 'id') || getValue(row, 'taskid') || ''),
                description: getValue(row, 'description') || getValue(row, 'desc') || '',
                category: getValue(row, 'category') || 'General'
             } as Task;
        }
        if (type === 'assignments') {
             return {
                employeeId: String(getValue(row, 'employeeid') || getValue(row, 'empid') || ''),
                taskId: String(getValue(row, 'taskid') || ''),
                id: `ASG-${Date.now()}-${Math.random().toString(36).substr(2,5)}`
             } as Assignment;
        }
        if (type === 'logs') {
             const rawDate = getValue(row, 'logdate') || getValue(row, 'date');
             let formattedDate = new Date().toISOString();
             
             // Try to handle raw date input
             if (rawDate) {
               if (rawDate instanceof Date) formattedDate = rawDate.toISOString();
               // Excel serial date handling could be added here if needed, usually sheet_to_json handles it
               else formattedDate = String(rawDate);
             }

             return {
                 id: String(getValue(row, 'id') || `LOG-${Date.now()}-${Math.random().toString(36).substr(2,9)}`),
                 logDate: formattedDate,
                 employeeId: String(getValue(row, 'employeeid') || getValue(row, 'empid') || ''),
                 taskId: String(getValue(row, 'taskid') || ''),
                 taskType: getValue(row, 'tasktype') || getValue(row, 'type') || 'Daily',
                 status: getValue(row, 'status') || 'Completed',
                 description: getValue(row, 'description') || getValue(row, 'desc') || '',
                 approvalStatus: getValue(row, 'approvalstatus') || 'Approved' // Default import to Approved
             } as TaskLog;
        }
        return row;
    }).filter(item => {
        if (type === 'employees') return item.id && item.name;
        if (type === 'tasks') return item.id && item.description;
        if (type === 'assignments') return item.employeeId && item.taskId;
        if (type === 'logs') return item.employeeId;
        return true;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              // Use { raw: false } to get formatted strings (dates as text) which solves date parsing issues
              const rawData = utils.sheet_to_json(ws, { raw: false });
              
              const processedData = processImportedData(rawData, importType);

              if (processedData.length > 0) {
                  onImport(processedData, importType);
                  setImportStatus({ msg: `تم استيراد ${processedData.length} سجل بنجاح في ${importType}`, type: 'success' });
              } else {
                  setImportStatus({ msg: 'الملف فارغ أو لا يحتوي على الأعمدة المطلوبة. تأكد من تطابق العناوين.', type: 'error' });
              }
          } catch (error) {
              console.error(error);
              setImportStatus({ msg: 'حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف Excel صالح.', type: 'error' });
          }
      };
      reader.readAsBinaryString(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Modal Handling ---
  const openAddModal = (type: 'employee' | 'task' | 'assignment') => {
    setItemType(type);
    setModalMode('add');
    if (type === 'employee') setFormData({ id: '', name: '', jobTitle: '', email: '', password: '', role: 'User', active: true, permissions: [] });
    if (type === 'task') setFormData({ id: '', description: '', category: 'General' });
    if (type === 'assignment') setFormData({ employeeId: '', taskId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any, type: 'employee' | 'task') => {
    setItemType(type);
    setModalMode('edit');
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
      setFormData((prev: any) => {
          const currentPerms = prev.permissions || [];
          if (currentPerms.includes(perm)) {
              return { ...prev, permissions: currentPerms.filter((p: string) => p !== perm) };
          } else {
              return { ...prev, permissions: [...currentPerms, perm] };
          }
      });
  };

  const toggleAllPermissions = (checked: boolean) => {
      if (checked) {
          setFormData((prev: any) => ({ ...prev, permissions: Object.values(PERMISSIONS) }));
      } else {
          setFormData((prev: any) => ({ ...prev, permissions: [] }));
      }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemType === 'employee') {
      const empData = formData as Employee;
      if (modalMode === 'add') {
         onAddEmployee(empData);
      } else {
         onUpdateEmployee(empData);
      }
    } else if (itemType === 'task') {
       if (modalMode === 'add') onAddTask(formData as Task);
       else onUpdateTask(formData as Task);
    } else if (itemType === 'assignment') {
       if (formData.employeeId && formData.taskId) {
           onAddAssignment(formData.employeeId, formData.taskId);
       }
    }
    setIsModalOpen(false);
  };

  const renderModalContent = () => {
    if (itemType === 'employee') {
        const allPermissions = [
            { id: PERMISSIONS.VIEW_DASHBOARD, label: 'عرض اللوحة الرئيسية' },
            { id: PERMISSIONS.LOG_TASKS, label: 'تسجيل المهام' },
            { id: PERMISSIONS.VIEW_REPORTS, label: 'عرض التقارير' },
            { id: PERMISSIONS.MANAGE_SYSTEM, label: 'إدارة النظام' },
        ];
        
        // Use safe access with optional chaining for permissions check
        const isAllSelected = allPermissions.every(p => formData?.permissions?.includes(p.id));

        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">الرقم الوظيفي (ID)</label>
                        <input className="w-full border rounded p-2" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={modalMode==='edit'} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">الاسم الكامل</label>
                        <input className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">المسمى الوظيفي</label>
                        <input className="w-full border rounded p-2" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} required />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
                        <input className="w-full border rounded p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">كلمة المرور</label>
                        <input className="w-full border rounded p-2" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">الدور (Role)</label>
                        <select className="w-full border rounded p-2" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="User">مستخدم (User)</option>
                            <option value="Admin">مسؤول (Admin)</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold">صلاحيات الوصول</label>
                        <label className="flex items-center gap-2 text-xs text-indigo-600 font-bold cursor-pointer bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">
                            <input 
                                type="checkbox" 
                                checked={isAllSelected}
                                onChange={(e) => toggleAllPermissions(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            تحديد كل الصلاحيات
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {allPermissions.map(perm => (
                            <label key={perm.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                                <input 
                                    type="checkbox" 
                                    checked={formData?.permissions?.includes(perm.id)} 
                                    onChange={() => togglePermission(perm.id)}
                                    className="rounded text-indigo-600" 
                                />
                                <span className="text-sm">{perm.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 bg-gray-50 p-2 rounded">
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                    <label className="text-sm font-bold">حساب نشط (يمكنه تسجيل الدخول)</label>
                </div>
            </>
        )
    }
    if (itemType === 'task') {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">رقم المهمة</label>
                    <input className="w-full border rounded p-2" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={modalMode==='edit'} required />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">وصف المهمة</label>
                    <textarea className="w-full border rounded p-2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">التصنيف</label>
                    <input className="w-full border rounded p-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
            </>
        )
    }
    if (itemType === 'assignment') {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">الموظف</label>
                    <select className="w-full border rounded p-2" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} required>
                        <option value="">اختر موظف...</option>
                        {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">المهمة</label>
                    <select className="w-full border rounded p-2" value={formData.taskId} onChange={e => setFormData({...formData, taskId: e.target.value})} required>
                        <option value="">اختر مهمة...</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
                    </select>
                </div>
            </>
        )
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-h-screen pb-20">
      {/* ... Headers & Tabs ... */}
      <div className="bg-gradient-to-l from-amber-50 to-white border-r-4 border-amber-500 p-6 rounded-lg flex justify-between items-center shadow-sm">
         <div>
          <h3 className="text-amber-900 font-bold flex items-center gap-2 text-lg">
            <Shield size={24} />
            لوحة إدارة النظام
          </h3>
          <p className="text-amber-700 text-sm mt-1">التحكم المركزي في المستخدمين، البيانات، وسجلات التدقيق.</p>
        </div>
      </div>

       <div className="flex border-b border-gray-200 overflow-x-auto bg-white rounded-t-xl px-2">
        <button onClick={() => {setActiveTab('employees'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'employees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Users size={16}/> الموظفين</button>
        <button onClick={() => {setActiveTab('tasks'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><ClipboardList size={16}/> المهام</button>
        <button onClick={() => {setActiveTab('assignments'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'assignments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Link size={16}/> التعيينات</button>
        <button onClick={() => {setActiveTab('task_logs'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'task_logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><History size={16}/> سجل المهام</button>
        <button onClick={() => {setActiveTab('system_logs'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'system_logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Server size={16}/> سجل النظام</button>
        <button onClick={() => {setActiveTab('import'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Database size={16}/> استيراد</button>
        <button onClick={() => {setActiveTab('settings'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Settings size={16}/> الإعدادات</button>
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden min-h-[500px]">
        
        {/* === EMPLOYEES TAB === */}
        {activeTab === 'employees' && (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 bg-gray-50">
                    <div className="relative flex-1">
                        <input type="text" placeholder="بحث بالاسم أو الرقم الوظيفي..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm" />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                    </div>
                    <select className="p-2 border rounded-lg text-sm" value={empRoleFilter} onChange={(e: any) => setEmpRoleFilter(e.target.value)}>
                        <option value="All">كل الأدوار</option>
                        <option value="Admin">مدير (Admin)</option>
                        <option value="User">مستخدم (User)</option>
                    </select>
                    <button onClick={() => openAddModal('employee')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus size={16}/> إضافة موظف</button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold">
                            <tr>
                                <th className="p-4 bg-gray-50 border-b">الرقم الوظيفي</th>
                                <th className="p-4 bg-gray-50 border-b">الاسم</th>
                                <th className="p-4 bg-gray-50 border-b">المسمى الوظيفي</th>
                                <th className="p-4 bg-gray-50 border-b">الدور</th>
                                <th className="p-4 bg-gray-50 border-b">آخر تعديل</th>
                                <th className="p-4 bg-gray-50 border-b">الحالة</th>
                                <th className="p-4 bg-gray-50 border-b">أدوات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono">{emp.id}</td>
                                    <td className="p-4 font-bold">{emp.name}</td>
                                    <td className="p-4 text-gray-600">{emp.jobTitle}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{emp.role}</span></td>
                                    <td className="p-4 text-xs font-mono text-gray-400" dir="ltr">{emp.lastModified ? new Date(emp.lastModified).toLocaleDateString('en-GB') : '-'}</td>
                                    <td className="p-4">{emp.active ? <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle size={12}/> نشط</span> : <span className="text-red-500 text-xs font-bold">معطل</span>}</td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => openEditModal(emp, 'employee')} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                                        <button onClick={() => onDeleteEmployee(emp.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* === TASKS TAB === */}
        {activeTab === 'tasks' && (
             <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 bg-gray-50">
                    <div className="relative flex-1">
                        <input type="text" placeholder="بحث في المهام..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm" />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                    </div>
                    <button onClick={() => openAddModal('task')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus size={16}/> إضافة مهمة</button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-sm">
                         <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold">
                            <tr>
                                <th className="p-4 bg-gray-50 border-b">رقم المهمة</th>
                                <th className="p-4 bg-gray-50 border-b">الوصف</th>
                                <th className="p-4 bg-gray-50 border-b">التصنيف</th>
                                <th className="p-4 bg-gray-50 border-b">عدد المعينين</th>
                                <th className="p-4 bg-gray-50 border-b">آخر تعديل</th>
                                <th className="p-4 bg-gray-50 border-b">أدوات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {filteredTasks.map(task => {
                                 const assignedCount = assignments.filter(a => a.taskId === task.id).length;
                                 return (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-mono">{task.id}</td>
                                        <td className="p-4 font-bold text-gray-700">{task.description}</td>
                                        <td className="p-4 text-gray-500"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{task.category}</span></td>
                                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{assignedCount} موظف</span></td>
                                        <td className="p-4 text-xs font-mono text-gray-400" dir="ltr">{task.lastModified ? new Date(task.lastModified).toLocaleDateString('en-GB') : '-'}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => openEditModal(task, 'task')} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                                            <button onClick={() => onDeleteTask(task.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                 )
                             })}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* === ASSIGNMENTS TAB === */}
        {activeTab === 'assignments' && (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 bg-gray-50">
                    <div className="relative flex-1">
                        <input type="text" placeholder="بحث باسم الموظف أو وصف المهمة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm" />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                    </div>
                    <button onClick={() => openAddModal('assignment')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus size={16}/> تعيين مهمة</button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-sm">
                         <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold">
                            <tr>
                                <th className="p-4 bg-gray-50 border-b">الموظف</th>
                                <th className="p-4 bg-gray-50 border-b">المهمة المعينة</th>
                                <th className="p-4 bg-gray-50 border-b">تاريخ التعيين</th>
                                <th className="p-4 bg-gray-50 border-b">أدوات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {filteredAssignments.map(assign => {
                                 const emp = employees.find(e => e.id === assign.employeeId);
                                 const task = tasks.find(t => t.id === assign.taskId);
                                 return (
                                    <tr key={assign.id} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{emp?.name || assign.employeeId}</div>
                                            <div className="text-xs text-gray-400">{emp?.jobTitle}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-700 font-medium">{task?.description || assign.taskId}</div>
                                            <div className="text-xs text-gray-400">{task?.category}</div>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-gray-400">{(assign.id || '').split('-')[1] ? new Date(parseInt((assign.id || '').split('-')[1])).toLocaleDateString() : '-'}</td>
                                        <td className="p-4">
                                            <button onClick={() => onDeleteAssignment(assign.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center gap-1 border border-red-100 text-xs"><Trash2 size={14}/> إلغاء التعيين</button>
                                        </td>
                                    </tr>
                                 )
                             })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* === TASK LOGS TAB === */}
        {activeTab === 'task_logs' && (
             <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-gray-50">
                   <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <input type="text" placeholder="بحث بالوصف، اسم الموظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm" />
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-gray-500">التاريخ:</span>
                            <input type="date" value={logStartDate} onChange={e => setLogStartDate(e.target.value)} disabled={showAllDates} className={`border rounded p-1 text-sm ${showAllDates ? 'bg-gray-200' : 'bg-white'}`} />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={logEndDate} onChange={e => setLogEndDate(e.target.value)} disabled={showAllDates} className={`border rounded p-1 text-sm ${showAllDates ? 'bg-gray-200' : 'bg-white'}`} />
                            <label className="flex items-center gap-1 text-xs font-bold cursor-pointer select-none">
                                <input type="checkbox" checked={showAllDates} onChange={e => setShowAllDates(e.target.checked)} className="rounded text-indigo-600" />
                                عرض الكل
                            </label>
                        </div>
                   </div>
                    {/* ... Filters ... */}
                    <div className="flex items-center justify-between">
                         <div className="text-xs text-gray-500 font-bold">عدد السجلات: {filteredTaskLogs.length}</div>
                         <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm"><FileSpreadsheet size={16}/> تصدير (Excel)</button>
                            <button onClick={handleBulkApprove} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"><CheckCircle size={16}/> مصادقة المعلق (Bulk)</button>
                         </div>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-sm min-w-[900px]">
                        <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold">
                            <tr>
                                <th className="p-4 bg-gray-50 border-b">الوقت والتاريخ</th>
                                <th className="p-4 bg-gray-50 border-b">المستخدم</th>
                                <th className="p-4 bg-gray-50 border-b">نوع المهمة</th> {/* Added Task Type */}
                                <th className="p-4 bg-gray-50 border-b">النشاط / المهمة</th>
                                <th className="p-4 bg-gray-50 border-b">الحالة</th>
                                <th className="p-4 bg-gray-50 border-b">الاعتماد</th>
                                <th className="p-4 bg-gray-50 border-b">أدوات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTaskLogs.map(log => {
                                const empName = employees.find(e => e.id === log.employeeId)?.name || log.employeeId;
                                // Safe date rendering
                                const logDateVal = log.logDate ? new Date(log.logDate) : new Date();
                                const isValidDate = !isNaN(logDateVal.getTime());
                                const displayDate = isValidDate ? logDateVal.toLocaleDateString('ar-EG') : 'تاريخ غير صالح';

                                return (
                                    <tr key={log.id} className={`hover:bg-gray-50 ${log.approvalStatus === 'Rejected' ? 'bg-red-50' : ''}`}>
                                        <td className="p-4 font-mono text-xs text-gray-500" dir="ltr">
                                            {displayDate}
                                        </td>
                                        <td className="p-4 font-bold text-gray-700">{empName}</td>
                                        <td className="p-4 text-xs font-bold text-gray-600">
                                            {log.taskType === 'Daily' && 'روتينية'}
                                            {log.taskType === 'Extra' && 'إضافية'}
                                            {log.status === 'Leave' && 'إجازة'}
                                        </td>
                                        <td className="p-4 text-gray-600 max-w-xs truncate" title={log.description}>{log.description}</td>
                                        <td className="p-4">{log.status==='Completed'?<span className="text-green-600 font-bold text-xs">منفذة</span>:log.status==='Pending'?<span className="text-red-600 font-bold text-xs">غير منفذة</span>:log.status==='NotApplicable'?<span className="text-gray-400 font-bold text-xs">لا تنطبق</span>:log.status}</td>
                                        <td className="p-4">
                                            {log.approvalStatus === 'Approved' ? 
                                              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 flex items-center gap-1 w-fit"><Check size={10}/> معتمد</span> : 
                                              log.approvalStatus === 'Rejected' ?
                                              <div className="group relative">
                                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 flex items-center gap-1 w-fit cursor-help"><X size={10}/> مرفوض</span>
                                                {log.managerNote && <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs p-2 rounded z-20 w-48">{log.managerNote}</div>}
                                              </div> :
                                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit"><AlertCircle size={10}/> معلق</span>
                                            }
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            {log.approvalStatus === 'PendingApproval' && (
                                                <>
                                                 <button onClick={() => onApproveLog(log.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded border border-green-200" title="اعتماد"><Check size={16}/></button>
                                                 <button onClick={() => handleSingleReject(log.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded border border-red-200" title="رفض"><X size={16}/></button>
                                                </>
                                            )}
                                            <button onClick={()=>onDeleteLog(log.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
        )}
        
        {/* === SYSTEM LOGS TAB (New) === */}
        {activeTab === 'system_logs' && (
             <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
                    <input type="text" placeholder="بحث في السجل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold">
                            <tr>
                                <th className="p-4 bg-gray-50 border-b">الوقت</th>
                                <th className="p-4 bg-gray-50 border-b">الفاعل</th>
                                <th className="p-4 bg-gray-50 border-b">نوع الإجراء</th>
                                <th className="p-4 bg-gray-50 border-b">الهدف</th>
                                <th className="p-4 bg-gray-50 border-b">التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSystemLogs.map(sysLog => (
                                <tr key={sysLog.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-xs font-mono text-gray-500" dir="ltr">{new Date(sysLog.timestamp || 0).toLocaleString('en-US')}</td>
                                    <td className="p-4 font-bold text-gray-700">{sysLog.actorName}</td>
                                    <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-200">{sysLog.actionType}</span></td>
                                    <td className="p-4 text-gray-600">{sysLog.target}</td>
                                    <td className="p-4 text-gray-500 text-xs">{sysLog.details}</td>
                                </tr>
                            ))}
                            {filteredSystemLogs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد سجلات نظام</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* === IMPORT TAB (New) === */}
        {activeTab === 'import' && (
             <div className="p-8 max-w-4xl mx-auto">
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                     <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2"><Database size={20}/> استيراد البيانات من Excel</h3>
                     <p className="text-blue-700 text-sm">يمكنك استيراد الموظفين، المهام، التعيينات، أو سجلات المهام. يرجى التأكد من مطابقة أسماء الأعمدة (Header) في الملف (نقبل ID, Name, JobTitle... أو الأسماء بالعربية مثل رقم الموظف، الاسم).</p>
                 </div>

                 <div className="flex gap-4 mb-6 justify-center flex-wrap">
                     <button onClick={() => setImportType('employees')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='employees'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>الموظفين</button>
                     <button onClick={() => setImportType('tasks')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='tasks'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>المهام</button>
                     <button onClick={() => setImportType('assignments')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='assignments'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>التعيينات</button>
                     <button onClick={() => setImportType('logs')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='logs'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>سجلات المهام</button>
                 </div>

                 <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors relative">
                     <input 
                       type="file" 
                       ref={fileInputRef}
                       onChange={handleFileUpload}
                       accept=".xlsx, .xls, .csv" 
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                     <p className="text-xl font-bold text-gray-700 mb-2">اضغط هنا أو اسحب الملف</p>
                     <p className="text-sm text-gray-500">صيغ مدعومة: XLSX, CSV (نوع الاستيراد: {importType === 'employees' ? 'موظفين' : importType === 'tasks' ? 'مهام' : importType === 'assignments' ? 'تعيينات' : 'سجلات مهام'})</p>
                 </div>

                 {importStatus && (
                     <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 ${importStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                         {importStatus.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                         {importStatus.msg}
                     </div>
                 )}
                 
                 <div className="mt-8">
                     <h4 className="font-bold text-gray-800 mb-2">الأعمدة المقبولة (بالعربية أو الإنجليزية):</h4>
                     <div className="bg-gray-100 p-4 rounded-lg font-mono text-xs text-gray-600 overflow-x-auto" dir="ltr">
                        {importType === 'employees' && "id/empid, name/empname, jobtitle/title, email, role, active"}
                        {importType === 'tasks' && "id/taskid, description/desc, category"}
                        {importType === 'assignments' && "employeeid/empid, taskid"}
                        {importType === 'logs' && "logdate/date, employeeid, taskid, status, description, approvalstatus"}
                     </div>
                 </div>
             </div>
        )}

        {/* === SETTINGS TAB (New) === */}
        {activeTab === 'settings' && (
             <div className="p-8 max-w-4xl mx-auto">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings size={24}/> إعدادات النظام</h3>
                 
                 <div className="space-y-6">
                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                         <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">إدارة البيانات (منطقة الخطر)</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                 <div>
                                     <p className="font-bold text-red-800">حذف سجلات المهام فقط</p>
                                     <p className="text-xs text-red-600">سيتم حذف جميع سجلات الأداء اليومية.</p>
                                 </div>
                                 <button onClick={() => {if(window.confirm('هل أنت متأكد؟')) onClearData('logs')}} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700">تنفيذ</button>
                             </div>
                             <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                 <div>
                                     <p className="font-bold text-red-800">تصفير النظام بالكامل</p>
                                     <p className="text-xs text-red-600">حذف الموظفين، المهام، والسجلات.</p>
                                 </div>
                                 <button onClick={() => {if(window.confirm('تحذير نهائي: سيتم مسح كل شيء!')) onClearData('all')}} className="px-4 py-2 bg-red-800 text-white rounded font-bold text-xs hover:bg-red-900">تنفيذ</button>
                             </div>
                         </div>
                     </div>

                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
                        <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                            <Globe size={20} /> نشر التطبيق (للموظفين)
                        </h4>
                        <div className="text-sm text-gray-600 space-y-2">
                            <p>لتشغيل التطبيق وجعله متاحاً للموظفين عبر الإنترنت، يجب رفعه على استضافة (Hosting).</p>
                            <p className="font-bold">خطوات الرفع على Firebase Hosting:</p>
                            <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-lg font-mono text-xs" dir="ltr">
                                <li>npm install -g firebase-tools</li>
                                <li>firebase login</li>
                                <li>firebase init hosting (Choose 'public' as directory, Yes to single-page app)</li>
                                <li>firebase deploy</li>
                            </ol>
                            <p className="mt-2 text-green-700 font-bold">سيكون رابط تطبيقك: <a href="https://taskease-11eb8.web.app" target="_blank" className="underline">https://taskease-11eb8.web.app</a></p>
                        </div>
                    </div>

                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                         <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">معلومات النظام</h4>
                         <div className="grid grid-cols-2 gap-4 text-sm">
                             <div className="p-3 bg-gray-50 rounded">
                                 <span className="text-gray-500 block">الإصدار</span>
                                 <span className="font-bold">v2.1.0 (Enterprise)</span>
                             </div>
                             <div className="p-3 bg-gray-50 rounded">
                                 <span className="text-gray-500 block">حالة قاعدة البيانات</span>
                                 <span className="font-bold text-green-600">متصل (Local State)</span>
                             </div>
                             <div className="p-3 bg-gray-50 rounded">
                                 <span className="text-gray-500 block">عدد الموظفين</span>
                                 <span className="font-bold">{employees.length}</span>
                             </div>
                             <div className="p-3 bg-gray-50 rounded">
                                 <span className="text-gray-500 block">عدد المهام المعرفة</span>
                                 <span className="font-bold">{tasks.length}</span>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
        )}

      </div>

      {/* Common Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">
                        {modalMode === 'add' ? 'إضافة عنصر جديد' : 'تعديل البيانات'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
                </div>
                <form onSubmit={handleModalSubmit}>
                    {renderModalContent()}
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">إلغاء</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

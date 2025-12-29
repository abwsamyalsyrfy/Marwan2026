
import React, { useState, useRef, useMemo } from 'react';
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, PERMISSIONS, Announcement } from '../types';
import { Database, Upload, Users, ClipboardList, FileDown, Check, History, Link, Plus, Trash2, Pencil, X, AlertTriangle, Shield, Key, Search, Calendar, Filter, Settings, AlertOctagon, RotateCcw, Lock, FileSpreadsheet, Server, Activity, UserCheck, UserX, CheckCircle, AlertCircle, CheckSquare, Download, Megaphone, Send, UserMinus, ChevronUp, ChevronDown, ListFilter, ShieldAlert, Clock, CalendarDays, MinusCircle, XCircle, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import { read, utils, writeFile } from 'xlsx';

interface AdminPanelProps {
  employees: Employee[];
  tasks: Task[];
  assignments: Assignment[];
  logs: TaskLog[];
  systemLogs?: SystemAuditLog[];
  announcements?: Announcement[];
  onAddAnnouncement: (announce: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
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
  employees, tasks, assignments, logs, systemLogs = [], announcements = [],
  onAddAnnouncement, onDeleteAnnouncement,
  onImport, onAddAssignment, onDeleteAssignment,
  onAddEmployee, onUpdateEmployee, onDeleteEmployee, 
  onAddTask, onUpdateTask, onDeleteTask, 
  onUpdateLog, onDeleteLog, onClearData,
  onApproveLog, onRejectLog
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'tasks' | 'assignments' | 'task_logs' | 'announcements' | 'system_logs' | 'import' | 'settings'>('employees');
  const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [empRoleFilter, setEmpRoleFilter] = useState<'All' | 'Admin' | 'User'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Filter States for Task Logs
  const [logStatusFilter, setLogStatusFilter] = useState('All'); 
  const [logApprovalFilter, setLogApprovalFilter] = useState('All'); 
  const [logTypeFilter, setLogTypeFilter] = useState('All'); 
  const [sortConfig, setSortConfig] = useState<{ key: keyof TaskLog | 'empName', direction: 'asc' | 'desc' } | null>({ key: 'logDate', direction: 'desc' });

  const [logStartDate, setLogStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]); 
  const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [importType, setImportType] = useState<'employees' | 'tasks' | 'assignments' | 'logs'>('employees');
  const [showAllDates, setShowAllDates] = useState(false);

  // Past Log State
  const [isPastLogModalOpen, setIsPastLogModalOpen] = useState(false);
  const [pastLogStep, setPastLogStep] = useState<1 | 2>(1);
  const [selectedPastEmpId, setSelectedPastEmpId] = useState('');
  const [selectedPastDate, setSelectedPastDate] = useState(new Date().toISOString().split('T')[0]);
  const [pastTaskDecisions, setPastTaskDecisions] = useState<Record<string, 'Completed' | 'Pending' | 'NotApplicable'>>({});

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'Normal' | 'Urgent' | 'Critical'>('Normal');
  const [annTargetType, setAnnTargetType] = useState<'All' | 'Specific'>('All');
  const [selectedTargetEmployeeIds, setSelectedTargetEmployeeIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [itemType, setItemType] = useState<'employee' | 'task' | 'assignment' | null>(null);
  const [formData, setFormData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

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
  
  const filteredTaskLogs = useMemo(() => {
    let result = logs.filter(l => {
        const desc = l.description || '';
        const empId = l.employeeId || '';
        const empName = employees.find(e => e.id === l.employeeId)?.name || '';
        
        const matchesSearch = desc.includes(searchTerm) || empId.includes(searchTerm) || empName.includes(searchTerm);
        
        let matchesDate = true;
        if (!showAllDates) {
            try {
                const logDateObj = new Date(l.logDate);
                if (isNaN(logDateObj.getTime())) {
                    matchesDate = false;
                } else {
                    const logDateStr = logDateObj.toISOString().split('T')[0];
                    matchesDate = logDateStr >= logStartDate && logDateStr <= logEndDate;
                }
            } catch (e) { matchesDate = false; }
        }

        const matchesStatus = logStatusFilter === 'All' || l.status === logStatusFilter;
        const matchesApproval = logApprovalFilter === 'All' || l.approvalStatus === logApprovalFilter;
        const matchesType = logTypeFilter === 'All' || l.taskType === logTypeFilter;

        return matchesSearch && matchesDate && matchesStatus && matchesApproval && matchesType;
    });

    if (sortConfig) {
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof TaskLog];
            let bValue: any = b[sortConfig.key as keyof TaskLog];

            if (sortConfig.key === 'empName') {
                aValue = employees.find(e => e.id === a.employeeId)?.name || '';
                bValue = employees.find(e => e.id === b.employeeId)?.name || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [logs, searchTerm, logStatusFilter, logApprovalFilter, logTypeFilter, sortConfig, logStartDate, logEndDate, showAllDates, employees]);

  const requestSort = (key: keyof TaskLog | 'empName') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
      if (sortConfig?.key !== key) return <div className="w-4 h-4 opacity-20"><ChevronUp size={14}/></div>;
      return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-600"/> : <ChevronDown size={14} className="text-indigo-600"/>;
  };

  const filteredSystemLogs = systemLogs.filter(l => {
      const actor = l.actorName || '';
      const details = l.details || '';
      const action = l.actionType || '';
      const matchesSearch = actor.includes(searchTerm) || details.includes(searchTerm) || action.includes(searchTerm);
      return matchesSearch; 
  }).sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    if (annTargetType === 'Specific' && selectedTargetEmployeeIds.length === 0) {
      alert('يرجى اختيار موظف واحد على الأقل أو تغيير الجمهور المستهدف إلى "الجميع".');
      return;
    }

    const newAnn: Announcement = {
      id: `ANN-${Date.now()}`,
      title: annTitle,
      content: annContent,
      priority: annPriority,
      createdAt: new Date().toISOString(),
      createdBy: 'مدير النظام',
      targetType: annTargetType,
    };

    if (annTargetType === 'Specific') {
      newAnn.targetEmployeeIds = selectedTargetEmployeeIds;
    }

    onAddAnnouncement(newAnn);
    setAnnTitle('');
    setAnnContent('');
    setAnnPriority('Normal');
    setAnnTargetType('All');
    setSelectedTargetEmployeeIds([]);
    alert('تم نشر التعميم بنجاح.');
  };

  const handleToggleTargetEmployee = (empId: string) => {
    setSelectedTargetEmployeeIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleBulkApprove = () => {
      const unapproved = filteredTaskLogs.filter(l => l.approvalStatus === 'PendingApproval');
      if (unapproved.length === 0) return;
      if (window.confirm(`هل أنت متأكد من المصادقة على ${unapproved.length} سجلات معلقة في القائمة الحالية؟`)) {
          unapproved.forEach(log => onApproveLog(log.id));
      }
  };

  const handleSingleReject = (logId: string) => {
      const reason = window.prompt("الرجاء إدخال سبب الرفض:");
      if (reason !== null) {
         onRejectLog(logId, reason || "رفض من قبل المسؤول");
      }
  };

  const handleExportBackup = () => {
      const backupData = {
          employees,
          tasks,
          assignments,
          logs,
          exportDate: new Date().toISOString(),
          version: '2.1.0'
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TaskEase_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const content = evt.target?.result as string;
              const backup = JSON.parse(content);
              if (!backup.employees || !backup.tasks) {
                  throw new Error("ملف غير صالح");
              }
              if (window.confirm('سيتم دمج البيانات المستوردة مع البيانات الحالية. هل ترغب في المتابعة؟')) {
                  if (backup.employees) onImport(backup.employees, 'employees');
                  if (backup.tasks) onImport(backup.tasks, 'tasks');
                  if (backup.assignments) onImport(backup.assignments, 'assignments');
                  if (backup.logs) onImport(backup.logs, 'logs');
                  alert('تمت استعادة النسخة الاحتياطية بنجاح.');
              }
          } catch (err) {
              alert('فشل استيراد النسخة الاحتياطية. تأكد من صحة الملف.');
          }
      };
      reader.readAsText(file);
      if (backupInputRef.current) backupInputRef.current.value = '';
  };

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
             if (rawDate) {
               if (rawDate instanceof Date) formattedDate = rawDate.toISOString();
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
                 approvalStatus: getValue(row, 'approvalstatus') || 'Approved'
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

  const handlePastLogSubmit = () => {
    if (!selectedPastEmpId || !selectedPastDate) {
      alert('يرجى اختيار الموظف والتاريخ أولاً.');
      return;
    }
    setPastLogStep(2);
  };

  const handleSavePastLogFinal = async () => {
    const empAssignments = assignments.filter(a => a.employeeId === selectedPastEmpId);
    if (empAssignments.length === 0) {
      alert('هذا الموظف ليس لديه مهام روتينية معينة.');
      setIsPastLogModalOpen(false);
      return;
    }

    const newLogs: TaskLog[] = empAssignments.map(asg => {
      const taskDef = tasks.find(t => t.id === asg.taskId);
      return {
        id: `LOG-PAST-${Date.now()}-${Math.random()}`,
        logDate: new Date(selectedPastDate).toISOString(),
        employeeId: selectedPastEmpId,
        taskId: asg.taskId,
        taskType: 'Daily',
        status: pastTaskDecisions[asg.taskId] || 'Pending',
        description: taskDef?.description || 'مهمة روتينية',
        approvalStatus: 'Approved', // Auto-approved as Admin is logging it
        approvedBy: 'مدير النظام (يدوي)',
        approvedAt: new Date().toISOString()
      };
    });

    onImport(newLogs, 'logs');
    alert(`تم تسجيل ${newLogs.length} مهام بنجاح للموظف في تاريخ ${selectedPastDate}`);
    
    // Reset state
    setIsPastLogModalOpen(false);
    setPastLogStep(1);
    setSelectedPastEmpId('');
    setPastTaskDecisions({});
  };

  const renderModalContent = () => {
    if (itemType === 'employee') {
        const allPermissions = [
            { id: PERMISSIONS.VIEW_DASHBOARD, label: 'عرض اللوحة الرئيسية' },
            { id: PERMISSIONS.LOG_TASKS, label: 'تسجيل المهام' },
            { id: PERMISSIONS.VIEW_REPORTS, label: 'عرض التقارير' },
            { id: PERMISSIONS.MANAGE_SYSTEM, label: 'إدارة النظام' },
        ];
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
                            <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAllPermissions(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                            تحديد كل الصلاحيات
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {allPermissions.map(perm => (
                            <label key={perm.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" checked={formData?.permissions?.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="rounded text-indigo-600" />
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
        <button onClick={() => {setActiveTab('announcements'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'announcements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Megaphone size={16}/> التعاميم</button>
        <button onClick={() => {setActiveTab('system_logs'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'system_logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Server size={16}/> سجل النظام</button>
        <button onClick={() => {setActiveTab('import'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Database size={16}/> استيراد</button>
        <button onClick={() => {setActiveTab('settings'); setSearchTerm('');}} className={`px-5 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Settings size={16}/> الإعدادات</button>
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden min-h-[500px]">
        
        {/* === ANNOUNCEMENTS TAB === */}
        {activeTab === 'announcements' && (
            <div className="p-8 max-w-5xl mx-auto space-y-10">
                <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8 shadow-sm">
                    <h4 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-3"><Send size={24}/> نشر تعميم إداري جديد</h4>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-indigo-700 mr-1">عنوان التعميم</label>
                                <input type="text" value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="مثلاً: بخصوص عطلة نهاية الأسبوع" className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-indigo-700 mr-1">مستوى الأهمية</label>
                                <select value={annPriority} onChange={(e: any) => setAnnPriority(e.target.value)} className="w-full p-3 border border-indigo-200 rounded-xl outline-none">
                                    <option value="Normal">عادي</option>
                                    <option value="Urgent">هام</option>
                                    <option value="Critical">عاجل جداً</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-indigo-700 mr-1">الجمهور المستهدف</label>
                            <div className="flex gap-4 p-1 bg-white border border-indigo-100 rounded-xl w-fit">
                                <button 
                                  type="button" 
                                  onClick={() => setAnnTargetType('All')} 
                                  className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${annTargetType === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                  الجميع
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setAnnTargetType('Specific')} 
                                  className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${annTargetType === 'Specific' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                  موظفين معينين
                                </button>
                            </div>
                            
                            {annTargetType === 'Specific' && (
                              <div className="bg-white border border-indigo-100 rounded-2xl p-4 animate-fade-in">
                                  <div className="flex items-center gap-2 mb-3 border-indigo-50 pb-2">
                                      <Search size={14} className="text-indigo-400" />
                                      <input type="text" placeholder="ابحث عن موظف..." className="w-full text-xs outline-none bg-transparent" />
                                  </div>
                                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 custom-scrollbar">
                                      {employees.filter(e => e.active).map(emp => (
                                          <label key={emp.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${selectedTargetEmployeeIds.includes(emp.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}>
                                              <input 
                                                type="checkbox" 
                                                checked={selectedTargetEmployeeIds.includes(emp.id)} 
                                                onChange={() => handleToggleTargetEmployee(emp.id)} 
                                                className="rounded text-indigo-600 focus:ring-indigo-500" 
                                              />
                                              <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-800">{emp.name}</span>
                                                <span className="text-[10px] text-gray-400">{emp.id}</span>
                                              </div>
                                          </label>
                                      ))}
                                  </div>
                                  <div className="mt-3 flex justify-between items-center px-1">
                                      <span className="text-[10px] font-bold text-indigo-500">تم اختيار {selectedTargetEmployeeIds.length} موظف</span>
                                      <button type="button" onClick={() => setSelectedTargetEmployeeIds(employees.filter(e => e.active).map(e => e.id))} className="text-[10px] font-black text-indigo-600 hover:underline">تحديد الجميع</button>
                                  </div>
                              </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-indigo-700 mr-1">المحتوى</label>
                            <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} placeholder="اكتب تفاصيل التعميم هنا..." className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none" required />
                        </div>
                        <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95"><Send size={18}/> إرسال التعميم الآن</button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h4 className="text-lg font-black text-gray-800 border-b pb-4">التعاميم السابقة</h4>
                    {announcements && announcements.length > 0 ? announcements.map(ann => (
                        <div key={ann.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                            <div className="flex gap-4 items-start">
                                <div className={`p-3 rounded-xl ${ann.priority === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}><Megaphone size={20}/></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-black text-gray-900">{ann.title}</h5>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${ann.targetType === 'Specific' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {ann.targetType === 'Specific' ? 'مخصص' : 'للجميع'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ann.content}</p>
                                    <span className="text-[10px] text-gray-400 font-bold mt-2 inline-block">تاريخ النشر: {new Date(ann.createdAt).toLocaleString('ar-EG')}</span>
                                </div>
                            </div>
                            <button onClick={() => onDeleteAnnouncement(ann.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20}/></button>
                        </div>
                    )) : (
                        <div className="text-center py-20 opacity-30">
                            <Megaphone size={64} className="mx-auto mb-4" />
                            <p className="font-bold">لم يتم نشر أي تعاميم بعد</p>
                        </div>
                    )}
                </div>
            </div>
        )}

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
             <div className="flex flex-col h-full bg-white">
                <div className="p-5 border-b border-gray-100 bg-gray-50/80 space-y-4">
                   <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                        <div className="xl:col-span-4 relative">
                            <input type="text" placeholder="بحث بالوصف، اسم الموظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                        </div>

                        <div className="xl:col-span-8 flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                                <ListFilter size={14} className="text-indigo-500" />
                                <select value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)} className="text-xs font-bold outline-none bg-transparent cursor-pointer">
                                    <option value="All">حالة التنفيذ (الكل)</option>
                                    <option value="Completed">منفذة</option>
                                    <option value="Pending">غير منفذة</option>
                                    <option value="NotApplicable">لا تنطبق</option>
                                    <option value="Leave">إجازة</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                                <CheckSquare size={14} className="text-emerald-500" />
                                <select value={logApprovalFilter} onChange={e => setLogApprovalFilter(e.target.value)} className="text-xs font-bold outline-none bg-transparent cursor-pointer">
                                    <option value="All">حالة الاعتماد (الكل)</option>
                                    <option value="Approved">معتمد</option>
                                    <option value="Rejected">مرفوض</option>
                                    <option value="PendingApproval">بانتظار المراجعة</option>
                                    <option value="CommitmentPending">طلب التزام</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                                <Activity size={14} className="text-blue-500" />
                                <select value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)} className="text-xs font-bold outline-none bg-transparent cursor-pointer">
                                    <option value="All">النوع (الكل)</option>
                                    <option value="Daily">روتينية</option>
                                    <option value="Extra">إضافية</option>
                                </select>
                            </div>
                        </div>
                   </div>

                   <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-4">
                        <div className="flex gap-3 items-center">
                            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                                <input type="date" value={logStartDate} onChange={e => setLogStartDate(e.target.value)} disabled={showAllDates} className={`px-2 py-1 text-xs font-bold outline-none rounded-lg ${showAllDates ? 'bg-gray-50 text-gray-300' : 'bg-white text-gray-700'}`} />
                                <span className="px-2 text-gray-300 flex items-center">-</span>
                                <input type="date" value={logEndDate} onChange={e => setLogEndDate(e.target.value)} disabled={showAllDates} className={`px-2 py-1 text-xs font-bold outline-none rounded-lg ${showAllDates ? 'bg-gray-50 text-gray-300' : 'bg-white text-gray-700'}`} />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-black text-gray-500 cursor-pointer select-none px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                <input type="checkbox" checked={showAllDates} onChange={e => setShowAllDates(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
                                عرض كل التواريخ
                            </label>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => setIsPastLogModalOpen(true)} className="bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-amber-700 shadow-lg shadow-amber-50 transition-all active:scale-95"><CalendarDays size={16}/> تسجيل المهام الفائتة</button>
                            <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all active:scale-95"><FileSpreadsheet size={16}/> تصدير Excel</button>
                            <button onClick={handleBulkApprove} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-800 shadow-lg shadow-indigo-50 transition-all active:scale-95"><CheckCircle size={16}/> مصادقة جماعية</button>
                        </div>
                   </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right text-sm min-w-[1000px]">
                        <thead className="bg-white sticky top-0 shadow-sm text-gray-600 z-10 font-bold border-b border-gray-200">
                            <tr>
                                <th onClick={() => requestSort('logDate')} className="p-5 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">الوقت والتاريخ {getSortIcon('logDate')}</div>
                                </th>
                                <th onClick={() => requestSort('empName')} className="p-5 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">الموظف {getSortIcon('empName')}</div>
                                </th>
                                <th onClick={() => requestSort('taskType')} className="p-5 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">النوع {getSortIcon('taskType')}</div>
                                </th>
                                <th className="p-5 bg-gray-50/50">النشاط / المهمة</th>
                                <th onClick={() => requestSort('status')} className="p-5 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">التنفيذ {getSortIcon('status')}</div>
                                </th>
                                <th onClick={() => requestSort('approvalStatus')} className="p-5 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">الاعتماد {getSortIcon('approvalStatus')}</div>
                                </th>
                                <th className="p-5 bg-gray-50/50 text-center">أدوات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTaskLogs.map(log => {
                                const empName = employees.find(e => e.id === log.employeeId)?.name || log.employeeId;
                                const logDateVal = log.logDate ? new Date(log.logDate) : new Date();
                                const isValidDate = !isNaN(logDateVal.getTime());
                                const displayDate = isValidDate ? logDateVal.toLocaleDateString('ar-EG') : 'تاريخ غير صالح';
                                return (
                                    <tr key={log.id} className={`hover:bg-indigo-50/30 transition-colors ${log.approvalStatus === 'Rejected' ? 'bg-red-50/50' : ''}`}>
                                        <td className="p-5 font-mono text-xs text-gray-400" dir="ltr">{displayDate}</td>
                                        <td className="p-5">
                                            <div className="font-black text-gray-800">{empName}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{log.employeeId}</div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${log.taskType === 'Daily' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                {log.taskType === 'Daily' ? 'روتينية' : 'إضافية'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-gray-600 max-w-xs font-medium" title={log.description}>{log.description}</td>
                                        <td className="p-5">
                                            {log.status==='Completed' || log.status==='منفذة' ? 
                                                <span className="text-emerald-600 font-black text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">منفذة</span> : 
                                                log.status==='Pending' || log.status==='غير منفذة' ? 
                                                <span className="text-red-600 font-black text-xs bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">غير منفذة</span> : 
                                                log.status==='NotApplicable' || log.status==='لا تنطبق' ? 
                                                <span className="text-gray-400 font-black text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">لا تنطبق</span> : 
                                                <span className="text-orange-600 font-black text-xs bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">{log.status}</span>
                                            }
                                        </td>
                                        <td className="p-5">
                                            {log.approvalStatus === 'Approved' ? 
                                              <span className="text-emerald-600 bg-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-200 flex items-center gap-1.5 w-fit shadow-sm"><Check size={12}/> معتمد</span> : 
                                              log.approvalStatus === 'Rejected' ?
                                              <div className="group relative">
                                                <span className="text-red-600 bg-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-red-200 flex items-center gap-1.5 w-fit cursor-help shadow-sm"><X size={12}/> مرفوض</span>
                                                {log.managerNote && <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] p-3 rounded-xl z-20 w-48 shadow-2xl animate-fade-in">{log.managerNote}</div>}
                                              </div> :
                                              log.approvalStatus === 'CommitmentPending' ?
                                              <span className="text-amber-600 bg-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-amber-200 flex items-center gap-1.5 w-fit shadow-sm animate-pulse"><ShieldAlert size={12}/> طلب التزام</span> :
                                              <span className="text-blue-600 bg-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-200 flex items-center gap-1.5 w-fit shadow-sm"><Clock size={12}/> معلق</span>
                                            }
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-center gap-2">
                                                {log.approvalStatus !== 'Approved' && (
                                                    <>
                                                        <button onClick={() => onApproveLog(log.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-100 transition-colors" title="اعتماد"><Check size={18}/></button>
                                                        <button onClick={() => handleSingleReject(log.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-colors" title="رفض"><X size={18}/></button>
                                                    </>
                                                )}
                                                <button onClick={()=>onDeleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTaskLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center opacity-30">
                                        <ClipboardList size={64} className="mx-auto mb-4" />
                                        <p className="font-black text-lg text-gray-500">لا توجد سجلات تطابق خيارات التصفية الحالية</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-2xl">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase opacity-70">إجمالي السجلات الحالية: {filteredTaskLogs.length}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400">
                            <span className="text-[10px] font-black uppercase">معتمدة: {filteredTaskLogs.filter(l => l.approvalStatus === 'Approved').length}</span>
                        </div>
                        <div className="flex items-center gap-2 text-red-400">
                            <span className="text-[10px] font-black uppercase">مرفوضة: {filteredTaskLogs.filter(l => l.approvalStatus === 'Rejected').length}</span>
                        </div>
                    </div>
                </div>
             </div>
        )}
        
        {/* === SYSTEM LOGS TAB === */}
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

        {/* === IMPORT TAB === */}
        {activeTab === 'import' && (
             <div className="p-8 max-w-4xl mx-auto">
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                     <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2"><Database size={20}/> استيراد البيانات من Excel</h3>
                     <p className="text-blue-700 text-sm">يمكنك استيراد الموظفين، المهام، التعيينات، أو سجلات المهام. يرجى التأكد من مطابقة أسماء الأعمدة (Header) في الملف.</p>
                 </div>
                 <div className="flex gap-4 mb-6 justify-center flex-wrap">
                     <button onClick={() => setImportType('employees')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='employees'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>الموظفين</button>
                     <button onClick={() => setImportType('tasks')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='tasks'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>المهام</button>
                     <button onClick={() => setImportType('assignments')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='assignments'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>التعيينات</button>
                     <button onClick={() => setImportType('logs')} className={`px-4 py-2 rounded-lg border text-sm font-bold ${importType==='logs'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-300'}`}>سجلات المهام</button>
                 </div>
                 <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors relative">
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                     <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                     <p className="text-xl font-bold text-gray-700 mb-2">اضغط هنا أو اسحب الملف</p>
                     <p className="text-sm text-gray-500">صيغ مدعومة: XLSX, CSV</p>
                 </div>
                 {importStatus && (
                     <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 ${importStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                         {importStatus.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                         {importStatus.msg}
                     </div>
                 )}
             </div>
        )}

        {/* === SETTINGS TAB === */}
        {activeTab === 'settings' && (
             <div className="p-8 max-w-4xl mx-auto">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings size={24}/> إعدادات النظام</h3>
                 <div className="space-y-6">
                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                         <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">النسخ الاحتياطي والاستعادة</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col items-center justify-center text-center gap-3">
                                 <Download size={32} className="text-indigo-600" />
                                 <p className="font-bold text-indigo-900">تصدير نسخة كاملة</p>
                                 <button onClick={handleExportBackup} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">تصدير الآن</button>
                             </div>
                             <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center gap-3 relative">
                                 <input type="file" ref={backupInputRef} onChange={handleImportBackup} accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                 <Upload size={32} className="text-blue-600" />
                                 <p className="font-bold text-blue-900">استيراد نسخة سابقة</p>
                                 <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">رفع الملف</button>
                             </div>
                         </div>
                     </div>
                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                         <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">إدارة البيانات (منطقة الخطر)</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <button onClick={() => {if(window.confirm('هل أنت متأكد؟')) onClearData('logs')}} className="px-4 py-4 bg-red-50 text-red-800 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-all">حذف سجلات المهام فقط</button>
                             <button onClick={() => {if(window.confirm('تحذير نهائي: سيتم مسح كل شيء!')) onClearData('all')}} className="px-4 py-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">تصفير النظام بالكامل</button>
                         </div>
                     </div>
                 </div>
             </div>
        )}
      </div>

      {/* Main Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">{modalMode === 'add' ? 'إضافة عنصر جديد' : 'تعديل البيانات'}</h3>
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

      {/* Past Log Modal */}
      {isPastLogModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
            <div className="bg-amber-600 p-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black mb-1">تسجيل مهام فائتة</h3>
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-widest">إدخال يدوي من قبل مدير النظام</p>
                </div>
                <button onClick={() => {setIsPastLogModalOpen(false); setPastLogStep(1);}} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"><X size={24}/></button>
              </div>
            </div>

            <div className="p-8">
              {pastLogStep === 1 ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">اختيار الموظف</label>
                    <select 
                      value={selectedPastEmpId} 
                      onChange={e => setSelectedPastEmpId(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm"
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.filter(e => e.active).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">تاريخ التسجيل الفائت</label>
                    <input 
                      type="date" 
                      value={selectedPastDate}
                      onChange={e => setSelectedPastDate(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsPastLogModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all">إلغاء</button>
                    <button 
                      onClick={handlePastLogSubmit}
                      className="flex-2 py-4 bg-amber-600 text-white rounded-2xl font-black hover:bg-amber-700 shadow-xl shadow-amber-100 transition-all"
                    >
                      تأكيد الاختيارات
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase">الموظف المختار</p>
                      <p className="text-sm font-black text-gray-800">{employees.find(e => e.id === selectedPastEmpId)?.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-amber-600 uppercase">التاريخ المحدد</p>
                      <p className="text-sm font-black text-gray-800">{selectedPastDate}</p>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {assignments.filter(a => a.employeeId === selectedPastEmpId).map(asg => {
                      const task = tasks.find(t => t.id === asg.taskId);
                      const currentStatus = pastTaskDecisions[asg.taskId];
                      return (
                        <div key={asg.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <p className="text-xs font-bold text-gray-800 flex-1">{task?.description}</p>
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => setPastTaskDecisions(prev => ({...prev, [asg.taskId]: 'Completed'}))}
                              className={`p-2 rounded-xl border transition-all ${currentStatus === 'Completed' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-200'}`}
                              title="منفذة"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => setPastTaskDecisions(prev => ({...prev, [asg.taskId]: 'Pending'}))}
                              className={`p-2 rounded-xl border transition-all ${currentStatus === 'Pending' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-red-200'}`}
                              title="غير منفذة"
                            >
                              <XCircle size={18} />
                            </button>
                            <button 
                              onClick={() => setPastTaskDecisions(prev => ({...prev, [asg.taskId]: 'NotApplicable'}))}
                              className={`p-2 rounded-xl border transition-all ${currentStatus === 'NotApplicable' ? 'bg-gray-600 text-white border-gray-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                              title="لا تنطبق"
                            >
                              <MinusCircle size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {assignments.filter(a => a.employeeId === selectedPastEmpId).length === 0 && (
                      <p className="text-center py-10 text-gray-400 font-bold italic">لا توجد مهام روتينية مسندة لهذا الموظف.</p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setPastLogStep(1)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all">رجوع</button>
                    <button 
                      onClick={handleSavePastLogFinal}
                      className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                    >
                      حفظ السجلات الفائتة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f9fafb; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
};

export default AdminPanel;

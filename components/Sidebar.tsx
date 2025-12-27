
import React, { useMemo } from 'react';
import { LayoutDashboard, ClipboardCheck, Users, Settings, PieChart, Bell, X, LogOut, Shield, UserCircle, AlertCircle, Megaphone } from 'lucide-react';
import { Employee, PERMISSIONS, TaskLog } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Employee | null;
  onLogout: () => void;
  missingLogsCount: number;
  isOpen: boolean;
  onClose: () => void;
  logs: TaskLog[];
  announcementsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, currentUser, onLogout, missingLogsCount,
  isOpen, onClose, logs, announcementsCount = 0
}) => {
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'Admin';
  const permissions = currentUser.permissions || [];
  
  const userAlerts = useMemo(() => {
    if (isAdmin) return { rejected: 0, pending: 0 };
    const myLogs = logs.filter(l => l.employeeId === currentUser.id);
    return {
      rejected: myLogs.filter(l => l.approvalStatus === 'Rejected').length,
      pending: myLogs.filter(l => l.approvalStatus === 'PendingApproval').length
    };
  }, [logs, currentUser.id, isAdmin]);

  const menuItems = [];

  if (permissions.includes(PERMISSIONS.VIEW_DASHBOARD)) {
    menuItems.push({ id: 'dashboard', label: 'اللوحة الرئيسية', icon: <LayoutDashboard size={20} /> });
  }
  
  if (permissions.includes(PERMISSIONS.LOG_TASKS)) {
    menuItems.push({ id: 'daily-log', label: 'تسجيل مهامي', icon: <ClipboardCheck size={20} /> });
  }

  if (permissions.includes(PERMISSIONS.VIEW_REPORTS)) {
    menuItems.push({ id: 'reports', label: 'التقارير والتحليلات', icon: <PieChart size={20} /> });
  }

  if (currentUser.role === 'Admin' || permissions.includes(PERMISSIONS.MANAGE_SYSTEM)) {
    menuItems.push({ id: 'admin', label: 'إدارة النظام', icon: <Shield size={20} /> });
  }

  menuItems.push({ id: 'profile', label: 'إعدادات حسابي', icon: <UserCircle size={20} /> });

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-0 right-0 h-screen bg-white z-50 w-64 shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:shadow-sm print:hidden
      `}>
        
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">ن</div>
            <div>
               <h1 className="text-lg font-bold text-gray-800">نظام المهام</h1>
               <p className="text-[10px] text-gray-500">{currentUser.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* تنبيه التعاميم الإدارية */}
        {announcementsCount > 0 && (
          <button 
            onClick={() => handleItemClick('dashboard')}
            className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 transition-transform active:scale-95"
          >
            <Megaphone size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-right">
              <p className="text-xs font-bold text-blue-800">تعاميم جديدة</p>
              <p className="text-[10px] text-blue-700 mt-1">توجد رسائل إدارية هامة في لوحة التحكم.</p>
            </div>
          </button>
        )}

        {/* تنبيه الإدارة للمدير */}
        {isAdmin && missingLogsCount > 0 && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Bell size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">تنبيه إداري</p>
              <p className="text-[10px] text-amber-700 mt-1">{missingLogsCount} موظف لم يسجلوا اليوم.</p>
            </div>
          </div>
        )}

        {/* تنبيه المرفوضات للموظف */}
        {!isAdmin && userAlerts.rejected > 0 && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-pulse">
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-800">مهام مرفوضة!</p>
              <p className="text-[10px] text-red-700 mt-1">لديك {userAlerts.rejected} مهمة تتطلب مراجعة.</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              {item.id === 'dashboard' && !isAdmin && userAlerts.rejected > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-red-500 hover:bg-red-50"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

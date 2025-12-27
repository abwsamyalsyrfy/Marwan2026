
import React from 'react';
import { LayoutDashboard, ClipboardCheck, Users, Settings, PieChart, Bell, X, LogOut, Shield, UserCircle } from 'lucide-react';
import { Employee, PERMISSIONS } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Employee | null;
  onLogout: () => void;
  missingLogsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, currentUser, onLogout, missingLogsCount,
  isOpen, onClose
}) => {
  if (!currentUser) return null;

  const permissions = currentUser.permissions || [];
  
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

  // Admin Link
  if (currentUser.role === 'Admin' || permissions.includes(PERMISSIONS.MANAGE_SYSTEM)) {
    menuItems.push({ id: 'admin', label: 'إدارة النظام', icon: <Shield size={20} /> });
  }

  // User Settings Link (Available for all)
  menuItems.push({ id: 'profile', label: 'إعدادات حسابي', icon: <UserCircle size={20} /> });

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 right-0 h-screen bg-white z-50 w-64 shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:shadow-sm print:hidden
      `}>
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              ن
            </div>
            <div>
               <h1 className="text-lg font-bold text-gray-800">نظام المهام</h1>
               <p className="text-[10px] text-gray-500">{currentUser.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Notification (Only for Admins/Dashboard viewers) */}
        {missingLogsCount > 0 && permissions.includes(PERMISSIONS.VIEW_DASHBOARD) && currentUser.role === 'Admin' && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Bell size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">تنبيه إداري</p>
              <p className="text-xs text-amber-700 mt-1">
                {missingLogsCount} موظف لم يسجلوا اليوم.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className={`${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer / Logout */}
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

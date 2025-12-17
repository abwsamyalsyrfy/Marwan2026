
import React, { useState } from 'react';
import { Employee } from '../types';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (user: Employee) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ employees, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Default Admin Backdoor (If no employees exist yet or emergency)
    // Only works if no employee with ID 'admin' exists in database
    if (employees.length === 0 && username === 'admin' && password === 'admin') {
      const tempAdmin: Employee = {
        id: 'admin',
        name: 'مدير النظام (مؤقت)',
        jobTitle: 'System Admin',
        email: 'admin@system.com',
        active: true,
        role: 'Admin',
        permissions: ['view_dashboard', 'log_tasks', 'view_reports', 'manage_system'],
        password: 'admin'
      };
      onLogin(tempAdmin);
      return;
    }

    const user = employees.find(e => e.id === username);

    if (!user) {
      setError('اسم المستخدم غير صحيح');
      return;
    }

    if (!user.active) {
      setError('هذا الحساب معطل. يرجى مراجعة المسؤول.');
      return;
    }

    // Direct password check (In real app, use hashing)
    if (user.password !== password) {
      setError('كلمة المرور غير صحيحة');
      return;
    }

    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">مُيسّر المهام</h1>
          <p className="text-indigo-100 mt-2">نظام إدارة المهام والأداء</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم المستخدم / الرقم الوظيفي</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="أدخل رقمك الوظيفي..."
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-transform active:scale-[0.98] shadow-lg shadow-indigo-200"
            >
              تسجيل الدخول
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            للحصول على حساب جديد أو استعادة كلمة المرور، يرجى التواصل مع مسؤول النظام.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

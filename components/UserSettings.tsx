
import React, { useState } from 'react';
import { Employee } from '../types';
import { Key, Save, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface UserSettingsProps {
  currentUser: Employee;
  onUpdatePassword: (newPassword: string) => Promise<boolean>;
}

const UserSettings: React.FC<UserSettingsProps> = ({ currentUser, onUpdatePassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Basic Validation
    if (currentUser.password && currentPassword !== currentUser.password) {
      setStatus({ type: 'error', msg: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', msg: 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onUpdatePassword(newPassword);
      if (success) {
        setStatus({ type: 'success', msg: 'تم تحديث كلمة المرور بنجاح' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatus({ type: 'error', msg: 'حدث خطأ أثناء التحديث، يرجى المحاولة لاحقاً' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'فشل الاتصال بقاعدة البيانات' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
          <Lock size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">إعدادات الحساب</h2>
          <p className="text-gray-500 font-medium">إدارة بيانات الدخول الخاصة بك</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {status && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in ${
                status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="font-bold text-sm">{status.msg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">كلمة المرور الحالية</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                    <Key size={18} />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pr-12 pl-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-sm font-bold text-gray-700 mr-1">كلمة المرور الجديدة</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pr-12 pl-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="6 أحرف على الأقل"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pr-12 pl-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={24} />
                  حفظ التغييرات
                </>
              )}
            </button>
          </form>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-start gap-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
            <AlertCircle size={20} />
          </div>
          <div>
            <h5 className="font-bold text-gray-800 mb-1">نصيحة أمنية</h5>
            <p className="text-gray-500 text-xs leading-relaxed font-medium">استخدم كلمة مرور قوية تحتوي على مزيج من الأحرف والأرقام لضمان حماية حسابك وتقاريرك اليومية.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;

import React, { useState, useEffect } from 'react';
import { Stethoscope, Facebook, Instagram, Youtube } from 'lucide-react';
import { Clinic } from '../types';

// ============================================================================
// ⚠️ تم تطبيق ملاحظة المشروع المحلي:
// - تم إلغاء التعليق عن الـ Imports الحقيقية.
// - تم حذف جميع الأكواد الوهمية (Mocks).
// ============================================================================

import { dbService, SystemConfig } from '../services/dbService';
import Button from '../components/Button';

interface LoginProps {
    onLogin: (user: Clinic) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const c = await dbService.getSystemConfig();
            setConfig(c);
        } catch (e) {
            console.error("Failed to load config", e);
        }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await dbService.login(email, password);
    setIsLoading(false);

    if (result.success && result.clinic) {
       onLogin(result.clinic as Clinic);
    } else {
       if (result.error === 'SUBSCRIPTION_EXPIRED') {
           window.location.hash = '#/expired';
       } else {
           setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
       }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-4">
          {config?.appLogoUrl ? (
             <img src={config.appLogoUrl} alt="App Logo" className="h-20 w-auto rounded-xl shadow-md object-contain" />
          ) : (
             <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">
                <Stethoscope size={48} />
             </div>
          )}

          {config?.customLogoUrl && (
             <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 h-[72px] flex items-center justify-center">
                <img src={config.customLogoUrl} alt="Clinic Logo" className="h-full w-auto object-contain rounded-md" />
             </div>
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">تسجيل الدخول للنظام</h2>
        <p className="mt-2 text-center text-sm text-gray-600">نظام إدارة العيادات الذكي</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" dir="ltr" />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</div>}
            <Button type="submit" className="w-full" isLoading={isLoading}>تسجيل الدخول</Button>
          </form>
        </div>
      </div>

      {config && config.socialLinks && (
        <div className="mt-8 flex justify-center gap-6">
            {config.socialLinks.facebook && (
                <a href={config.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition">
                    <Facebook size={24} />
                </a>
            )}
            {config.socialLinks.instagram && (
                <a href={config.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition">
                    <Instagram size={24} />
                </a>
            )}
            {config.socialLinks.youtube && (
                <a href={config.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 transition">
                    <Youtube size={24} />
                </a>
            )}
        </div>
      )}
    </div>
  );
};

export default Login;

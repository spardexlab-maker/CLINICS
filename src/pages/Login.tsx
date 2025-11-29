
import React, { useState, useEffect } from 'react';
import { dbService, SystemConfig } from '../services/dbService';
import Button from '../components/Button';
import { Stethoscope, Facebook, Instagram, Youtube } from 'lucide-react';
import { Clinic } from '../types';

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
    setConfig(dbService.getSystemConfig());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate Network Delay
    setTimeout(async () => {
      const result = await dbService.login(email, password);
      setIsLoading(false);
      
      if (result.success && result.clinic) {
         onLogin(result.clinic);
      } else {
         if (result.error === 'SUBSCRIPTION_EXPIRED') {
             // Redirect immediately to the expired page
             window.location.hash = '#/expired';
         } else {
             setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
         }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-4">
          <div className="bg-primary-600 p-3 rounded-xl text-white shadow-lg">
            <Stethoscope size={48} />
          </div>
          
          {/* Custom Logo Display */}
          {config?.customLogoUrl && (
             <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 h-[72px] flex items-center justify-center">
                <img 
                    src={config.customLogoUrl} 
                    alt="Clinic Logo" 
                    className="h-full w-auto object-contain rounded-md"
                />
             </div>
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          تسجيل الدخول للنظام
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          نظام إدارة العيادات الذكي - العراق
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}

            <div>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                تسجيل الدخول
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Social Icons Footer */}
      {config && (
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

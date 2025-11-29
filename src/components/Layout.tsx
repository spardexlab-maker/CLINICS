
import React, { useEffect, useState } from 'react';
import { dbService, SystemConfig } from '../services/dbService';
import { LogOut, Stethoscope, LayoutDashboard, ShieldCheck, Banknote } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onLogout }) => {
  const clinic = dbService.getCurrentClinic();
  const isAdmin = clinic?.role === 'admin';
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const config = dbService.getSystemConfig();
    if (config.customLogoUrl) {
        setLogoUrl(config.customLogoUrl);
    }
  }, []);

  const handleLogoutClick = () => {
    dbService.logout();
    if (onLogout) {
      onLogout();
    }
  };

  const currentPath = window.location.hash;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Default App Logo - Always Visible */}
              <div className={`p-2 rounded-lg text-white ${isAdmin ? 'bg-purple-700' : 'bg-primary-600'}`}>
                  {isAdmin ? <ShieldCheck size={24} /> : <Stethoscope size={24} />}
              </div>

              {/* Custom Logo - Side by Side if exists */}
              {logoUrl && (
                 <img 
                    src={logoUrl} 
                    alt="Custom Logo" 
                    className="h-10 w-auto rounded object-contain border border-gray-100 bg-white" 
                 />
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">{isAdmin ? 'إدارة النظام (SaaS)' : 'نظام عيادتي'}</h1>
                <p className="text-xs text-gray-500 font-medium">{clinic?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Only show Dashboard link if not admin, or different dashboard for admin */}
              {!isAdmin && (
                <>
                  <button 
                    onClick={() => window.location.hash = '#/'}
                    className={`flex items-center gap-2 transition-colors ${currentPath === '#/' || currentPath === '' ? 'text-primary-600 font-bold' : 'text-gray-600 hover:text-primary-600'}`}
                  >
                    <LayoutDashboard size={20} />
                    <span className="hidden sm:inline">لوحة التحكم</span>
                  </button>

                  <button 
                    onClick={() => window.location.hash = '#/accounting'}
                    className={`flex items-center gap-2 transition-colors ${currentPath === '#/accounting' ? 'text-green-600 font-bold' : 'text-gray-600 hover:text-green-600'}`}
                  >
                    <Banknote size={20} />
                    <span className="hidden sm:inline">الحسابات</span>
                  </button>
                </>
              )}

              {/* Admin Link - Only visible to Admin */}
              {isAdmin && (
                <button 
                  onClick={() => window.location.hash = '#/admin'}
                  className={`flex items-center gap-2 transition-colors ${currentPath === '#/admin' ? 'text-purple-700 font-bold' : 'text-gray-600 hover:text-purple-700'}`}
                >
                  <ShieldCheck size={20} />
                  <span className="hidden sm:inline">إدارة الاشتراكات</span>
                </button>
              )}

              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              
              <button 
                onClick={handleLogoutClick}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">تسجيل خروج</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </header>
        {children}
      </main>
    </div>
  );
};

export default Layout;

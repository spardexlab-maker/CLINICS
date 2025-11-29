
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientFile from './pages/PatientFile';
import AdminDashboard from './pages/AdminDashboard';
import SubscriptionExpired from './pages/SubscriptionExpired';
import Accounting from './pages/Accounting'; // New Import
import { dbService } from './services/dbService';
import { Clinic } from './types';

const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.hash || '#/login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Initialize Auth
  useEffect(() => {
    const session = dbService.getCurrentClinic();
    if (session) {
      setIsAuthenticated(true);
      setUserRole(session.role);
    }
    setIsChecking(false);

    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Protect Routes
  useEffect(() => {
     if (!isChecking) {
       // If searching for expired page, allow it
       if (route === '#/expired') return;

       if (!isAuthenticated && route !== '#/login') {
           window.location.hash = '#/login';
       }
     }
  }, [route, isAuthenticated, isChecking]);

  const handleLoginSuccess = (user: Clinic) => {
      setIsAuthenticated(true);
      setUserRole(user.role);
      
      // Navigate based on role
      if (user.role === 'admin') {
          window.location.hash = '#/admin';
      } else {
          window.location.hash = '#/';
      }
  };

  const handleLogout = () => {
      dbService.logout();
      setIsAuthenticated(false);
      setUserRole(null);
      window.location.hash = '#/login';
  };

  const renderRoute = () => {
    if (isChecking) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

    // Public Route: Expired
    if (route === '#/expired') {
        return <SubscriptionExpired />;
    }

    if (!isAuthenticated) return <Login onLogin={handleLoginSuccess} />;

    // --- Admin Routes ---
    if (userRole === 'admin') {
        return <AdminDashboard onLogout={handleLogout} />;
    }

    // --- Doctor/Clinic Routes ---
    if (route === '#/accounting') {
       return <Accounting onLogout={handleLogout} />;
    }

    if (route.startsWith('#/patient/')) {
      const id = route.split('/patient/')[1];
      return <PatientFile patientId={id} onLogout={handleLogout} />;
    }
    
    // Default for doctor
    return <Dashboard onLogout={handleLogout} />;
  };

  return (
    <>
      {renderRoute()}
    </>
  );
};

export default App;

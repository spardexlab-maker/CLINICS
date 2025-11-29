import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { dbService } from '../services/dbService';
import { Check, X, CreditCard, ShieldCheck, Zap } from 'lucide-react';

const Subscription: React.FC = () => {
  const [clinic, setClinic] = useState(dbService.getCurrentClinic());
  const [isLoading, setIsLoading] = useState(false);

  // Mock Invoice History
  const invoices = [
    { id: 'INV-002', date: '2024-02-01', amount: '50,000 IQD', status: 'مدفوع' },
    { id: 'INV-001', date: '2024-01-01', amount: '50,000 IQD', status: 'مدفوع' },
  ];

  const handleUpgrade = () => {
    setIsLoading(true);
    // Simulate API call to Payment Gateway (ZainCash/AsiaPay)
    setTimeout(() => {
      const updated = dbService.upgradeSubscription(true);
      setClinic(updated || null);
      setIsLoading(false);
      alert('تم تجديد الاشتراك بنجاح!');
    }, 1500);
  };

  const handleDowngrade = () => {
    if (confirm('هل أنت متأكد من إلغاء الاشتراك؟ ستفقد ميزات الذكاء الاصطناعي.')) {
        setIsLoading(true);
        setTimeout(() => {
            const updated = dbService.upgradeSubscription(false);
            setClinic(updated || null);
            setIsLoading(false);
        }, 1000);
    }
  };

  return (
    <Layout title="إدارة الاشتراكات">
      
      {/* Status Banner */}
      <div className={`mb-8 p-6 rounded-xl border ${clinic?.subscriptionActive ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              حالة الاشتراك: <span className={clinic?.subscriptionActive ? 'text-green-700' : 'text-orange-700'}>{clinic?.subscriptionActive ? 'نشط (PRO)' : 'نسخة مجانية (Basic)'}</span>
            </h2>
            <p className="text-sm text-gray-600">
              {clinic?.subscriptionActive 
                ? 'اشتراكك ساري المفعول حتى 2024-12-31' 
                : 'أنت تستخدم النسخة المجانية المحدودة.'}
            </p>
          </div>
          <div className="bg-white p-3 rounded-full shadow-sm">
            {clinic?.subscriptionActive ? <ShieldCheck className="text-green-600" size={32} /> : <Zap className="text-orange-500" size={32} />}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        
        {/* Free Plan */}
        <div className={`border rounded-xl p-6 relative ${!clinic?.subscriptionActive ? 'ring-2 ring-primary-500 bg-white' : 'bg-gray-50 border-gray-200'}`}>
          {!clinic?.subscriptionActive && <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-600 text-white px-3 py-1 text-xs rounded-full">الخطة الحالية</div>}
          <h3 className="text-lg font-bold text-gray-900 mb-2">الباقة الأساسية</h3>
          <div className="text-3xl font-extrabold text-gray-900 mb-6">مجاناً</div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-green-500" /> تسجيل عدد محدود من المرضى</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check size={16} className="text-green-500" /> إدارة الزيارات الأساسية</li>
            <li className="flex items-center gap-2 text-sm text-gray-400"><X size={16} /> مساعد الذكاء الاصطناعي (محدود)</li>
            <li className="flex items-center gap-2 text-sm text-gray-400"><X size={16} /> دعم فني مباشر</li>
          </ul>
          {clinic?.subscriptionActive && (
            <Button variant="secondary" className="w-full" onClick={handleDowngrade} isLoading={isLoading}>
              إلغاء الاشتراك والعودة للمجاني
            </Button>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`border rounded-xl p-6 relative ${clinic?.subscriptionActive ? 'ring-2 ring-primary-500 bg-white shadow-lg' : 'bg-white border-gray-200'}`}>
          {clinic?.subscriptionActive && <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-600 text-white px-3 py-1 text-xs rounded-full">الباقة النشطة</div>}
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-gray-900 mb-2">باقة العيادة المتكاملة</h3>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded font-bold">AI Powered</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mb-1">50,000 <span className="text-sm font-normal text-gray-500">د.ع / شهرياً</span></div>
          <p className="text-xs text-gray-500 mb-6">تدفع سنوياً أو شهرياً</p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-gray-800"><Check size={16} className="text-primary-600" /> عدد غير محدود من المرضى</li>
            <li className="flex items-center gap-2 text-sm text-gray-800"><Check size={16} className="text-primary-600" /> <b>مساعد طبي ذكي (Gemini AI)</b></li>
            <li className="flex items-center gap-2 text-sm text-gray-800"><Check size={16} className="text-primary-600" /> طباعة الوصفات الطبية (PDF)</li>
            <li className="flex items-center gap-2 text-sm text-gray-800"><Check size={16} className="text-primary-600" /> دعم فني 24/7</li>
          </ul>

          {!clinic?.subscriptionActive ? (
            <Button variant="primary" className="w-full" onClick={handleUpgrade} isLoading={isLoading}>
              ترقية الاشتراك الآن
            </Button>
          ) : (
             <Button variant="secondary" className="w-full" disabled>
              تم الاشتراك
            </Button>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <CreditCard size={20} className="text-gray-500"/>
            <h3 className="text-lg font-medium text-gray-900">سجل المدفوعات السابقة</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((inv) => (
                <tr key={inv.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {inv.status}
                        </span>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Subscription;
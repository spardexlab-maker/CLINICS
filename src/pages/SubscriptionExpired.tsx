import React, { useEffect, useState } from 'react';
import { dbService, SystemConfig } from '../services/dbService';
import { Lock, CreditCard, ExternalLink } from 'lucide-react';
import Button from '../components/Button';

const SubscriptionExpired: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    setConfig(dbService.getSystemConfig());
  }, []);

  if (!config) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
            
            {/* Header Alert */}
            <div className="bg-red-600 p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-800 mb-4">
                    <Lock className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">انتهت صلاحية الاشتراك</h2>
                <p className="mt-2 text-red-100">
                    عذراً، تم إيقاف حسابك مؤقتاً لانتهاء الفترة التجريبية أو الاشتراك.
                </p>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
                
                <div className="text-center">
                    <p className="text-gray-700 font-medium text-lg mb-4">
                        {config.paymentInstructions}
                    </p>
                    
                    {/* Barcode / Payment Image */}
                    {config.paymentBarcodeUrl && (
                        <div className="border-4 border-gray-100 rounded-xl p-4 inline-block shadow-inner bg-gray-50">
                            <img 
                                src={config.paymentBarcodeUrl} 
                                alt="طرق الدفع - باركود" 
                                className="h-64 w-64 object-contain mx-auto mix-blend-multiply"
                            />
                            <p className="mt-2 text-xs text-gray-500 font-mono">امسح الرمز للدفع</p>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                    <CreditCard className="text-blue-600 mt-1 ml-3 flex-shrink-0" size={20} />
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">كيفية تفعيل الحساب؟</h4>
                        <ol className="list-decimal list-inside text-sm text-blue-800 mt-1 space-y-1">
                            <li>قم بتحويل مبلغ الاشتراك عبر زين كاش أو ماستر كارد.</li>
                            <li>أرسل صورة الوصل إلى فريق الدعم الفني.</li>
                            <li>سيقوم الأدمن بتفعيل حسابك خلال دقائق.</li>
                        </ol>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button 
                        onClick={() => window.location.hash = '#/login'}
                        variant="secondary"
                        className="w-full justify-center"
                    >
                        العودة لصفحة الدخول
                    </Button>
                    {config.supportWhatsapp && (
                        <a 
                            href={`https://wa.me/${config.supportWhatsapp}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm"
                        >
                            <ExternalLink size={16} className="ml-2" />
                            تواصل مع الدعم الفني (واتساب)
                        </a>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpired;
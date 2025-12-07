import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { dbService, SystemConfig } from '../services/dbService';
import { Clinic } from '../types';
import { CheckCircle, XCircle, Calendar, Plus, Trash2, Edit2, Settings, List, Save, Clock, RefreshCcw, Ban, Bot, Upload } from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'clinics' | 'settings'>('clinics');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  
  // Settings State
  const [config, setConfig] = useState<SystemConfig>({ 
      paymentBarcodeUrl: '', 
      paymentInstructions: '',
      supportWhatsapp: '',
      customLogoUrl: '',
      appLogoUrl: '',
      socialLinks: { facebook: '', instagram: '', youtube: '' }
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
      name: '', email: '', password: '', aiUsageLimit: '50', subscriptionEndDate: '' 
  });

  // Modal State for Renewal
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewClinicId, setRenewClinicId] = useState<string | null>(null);

  useEffect(() => {
    loadClinics();
    loadSettings();
  }, []);

  const loadClinics = async () => {
    const data = await dbService.getAllClinics();
    setClinics(data);
  };

  const loadSettings = async () => {
      const data = await dbService.getSystemConfig();
      setConfig(data);
  };

  // --- Settings Logic (نفس الكود الأصلي الخاص بك تماماً) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'appLogoUrl' | 'customLogoUrl' | 'paymentBarcodeUrl') => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setConfig(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.updateSystemConfig(config);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
    // Reload to apply new logos
    window.location.reload();
  };

  // --- Clinic Logic ---
  const handleDelete = async (clinicId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه العيادة نهائياً؟')) {
        await dbService.deleteClinic(clinicId);
        loadClinics();
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', email: '', password: '', aiUsageLimit: '50', subscriptionEndDate: '' }); 
    setIsModalOpen(true);
  };

  const openEditModal = (clinic: Clinic) => {
    setModalMode('edit');
    setSelectedClinicId(clinic.id);
    
    // تحويل التاريخ لصيغة تناسب الـ Input Date
    const formattedDate = clinic.subscriptionEndDate 
        ? new Date(clinic.subscriptionEndDate).toISOString().split('T')[0] 
        : '';

    setFormData({ 
        name: clinic.name, 
        email: clinic.email, 
        password: '',
        aiUsageLimit: (clinic.aiUsageLimit || 50).toString(),
        subscriptionEndDate: formattedDate
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (modalMode === 'add') {
            await dbService.addClinic({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
        } else if (modalMode === 'edit' && selectedClinicId) {
            await dbService.updateClinic(selectedClinicId, {
                name: formData.name, 
                email: formData.email, 
                password: formData.password,
                aiUsageLimit: parseInt(formData.aiUsageLimit) || 50,
                subscriptionEndDate: formData.subscriptionEndDate
            });
        }
        setIsModalOpen(false);
        loadClinics();
    } catch (err) {
        alert(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  const openRenewModal = (clinicId: string) => {
      setRenewClinicId(clinicId);
      setIsRenewModalOpen(true);
  };

  const handleRenew = async (days: number) => {
      if (!renewClinicId) return;
      await dbService.extendSubscription(renewClinicId, days);
      setIsRenewModalOpen(false);
      await loadClinics();
  };

  const handleStopSubscription = async (clinicId: string) => {
      if (confirm('هل أنت متأكد من إيقاف اشتراك هذه العيادة؟')) {
          await dbService.stopSubscription(clinicId);
          await loadClinics(); 
      }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-CA');
  };

  return (
    <Layout title="إدارة النظام (SaaS)" onLogout={onLogout}>
      
      <div className="flex space-x-4 space-x-reverse mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('clinics')}
            className={`pb-2 px-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'clinics' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <List size={18} />
              إدارة العيادات
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'settings' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <Settings size={18} />
              إعدادات النظام
          </button>
      </div>

      {/* --- CLINICS TAB --- */}
      {activeTab === 'clinics' && (
        <>
            <div className="mb-4 flex justify-end">
                <Button onClick={openAddModal}>
                    <Plus size={18} className="ml-2" />
                    إضافة عيادة جديدة
                </Button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العيادة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">استهلاك AI</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {clinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{clinic.name}</div>
                        <div className="text-xs text-gray-500">{clinic.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        {clinic.subscriptionActive ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 gap-1 items-center">
                            <CheckCircle size={12} /> نشط
                            </span>
                        ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 gap-1 items-center">
                            <XCircle size={12} /> منتهي
                            </span>
                        )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                           <div className="flex items-center gap-1">
                               <Bot size={14} className="text-indigo-500" />
                               <span className="font-bold">{clinic.aiUsageCount || 0}</span>
                               <span className="text-gray-400">/</span>
                               <span>{clinic.aiUsageLimit || 50}</span>
                           </div>
                           <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-indigo-600 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(((clinic.aiUsageCount || 0) / (clinic.aiUsageLimit || 50)) * 100, 100)}%` }}
                              ></div>
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono" dir="ltr">
                            {formatDate(clinic.subscriptionEndDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2">
                                <Button variant="secondary" size="sm" className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={() => openRenewModal(clinic.id)}>
                                    <RefreshCcw size={14} className="ml-1" /> تجديد
                                </Button>
                                {clinic.subscriptionActive && (
                                    <button onClick={() => handleStopSubscription(clinic.id)} className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded" title="إيقاف">
                                        <Ban size={18} />
                                    </button>
                                )}
                                <button onClick={() => openEditModal(clinic)} className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded" title="تعديل">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(clinic.id)} className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded" title="حذف">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                    {clinics.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد عيادات مسجلة</td></tr>
                    )}
                </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {/* --- SETTINGS TAB (كما طلبت) --- */}
      {activeTab === 'settings' && (
          <div className="max-w-3xl bg-white shadow rounded-lg p-6 border border-gray-200">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                  
                  {/* Logos Section */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">المظهر والشعارات</h4>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">الشعار الأساسي (App Logo)</label>
                                <div className="flex items-center gap-4">
                                    {config.appLogoUrl ? (
                                        <img src={config.appLogoUrl} alt="App Logo" className="h-12 w-12 object-contain border rounded" />
                                    ) : <div className="h-12 w-12 bg-gray-100 rounded border flex items-center justify-center text-xs">Default</div>}
                                    <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                        <Upload size={16}/> تغيير
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'appLogoUrl')} />
                                    </label>
                                </div>
                          </div>

                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">الشعار الثانوي (Custom Logo)</label>
                                <div className="flex items-center gap-4">
                                    {config.customLogoUrl ? (
                                        <img src={config.customLogoUrl} alt="Custom Logo" className="h-12 w-12 object-contain border rounded" />
                                    ) : <div className="h-12 w-12 bg-gray-100 rounded border flex items-center justify-center text-xs">None</div>}
                                    <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                        <Upload size={16}/> تغيير
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'customLogoUrl')} />
                                    </label>
                                </div>
                          </div>
                      </div>
                  </div>

                  {/* Payment Section */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">إعدادات الدفع</h4>
                      <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تعليمات الدفع</label>
                            <textarea
                                rows={2}
                                value={config.paymentInstructions}
                                onChange={(e) => setConfig({...config, paymentInstructions: e.target.value})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">صورة الباركود (QR Code)</label>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'paymentBarcodeUrl')}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            />
                            {config.paymentBarcodeUrl && <img src={config.paymentBarcodeUrl} alt="QR" className="h-20 object-contain mt-2 border rounded" />}
                        </div>
                      </div>
                  </div>

                  {/* Social Section */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">التواصل</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-gray-700">واتساب</label><input type="text" dir="ltr" value={config.supportWhatsapp} onChange={(e) => setConfig({...config, supportWhatsapp: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
                        <div><label className="text-sm font-medium text-gray-700">فيسبوك</label><input type="url" dir="ltr" value={config.socialLinks?.facebook} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, facebook: e.target.value}})} className="w-full border rounded px-3 py-2" /></div>
                        <div><label className="text-sm font-medium text-gray-700">انستغرام</label><input type="url" dir="ltr" value={config.socialLinks?.instagram} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, instagram: e.target.value}})} className="w-full border rounded px-3 py-2" /></div>
                        <div><label className="text-sm font-medium text-gray-700">يوتيوب</label><input type="url" dir="ltr" value={config.socialLinks?.youtube} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, youtube: e.target.value}})} className="w-full border rounded px-3 py-2" /></div>
                      </div>
                  </div>

                  <div className="pt-2">
                      <Button type="submit" className="flex items-center gap-2">
                          <Save size={18} />
                          حفظ الإعدادات
                      </Button>
                      {settingsSaved && <span className="mr-3 text-green-600 font-medium animate-pulse">تم الحفظ بنجاح!</span>}
                  </div>
              </form>
          </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'إضافة عيادة جديدة' : 'تعديل بيانات العيادة'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">اسم العيادة</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded px-3 py-2"/></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">البريد الإلكتروني</label><input type="email" required dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border rounded px-3 py-2"/></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">كلمة المرور</label><input type="text" placeholder={modalMode === 'edit' ? "اتركه فارغاً لعدم التغيير" : "أدخل كلمة المرور"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border rounded px-3 py-2" dir="ltr" /></div>
            
            {/* تاريخ الانتهاء يظهر فقط عند التعديل */}
            {modalMode === 'edit' && (
                <div className="space-y-1 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <label className="flex items-center gap-2 text-sm font-bold text-yellow-800"><Clock size={16} /> تاريخ انتهاء الصلاحية</label>
                    <input type="date" value={formData.subscriptionEndDate} onChange={e => setFormData({...formData, subscriptionEndDate: e.target.value})} className="w-full border rounded px-3 py-2 bg-white" />
                </div>
            )}

            <div className="pt-2 border-t mt-2"><label className="block text-sm font-medium text-indigo-700 mb-1">رصيد AI</label><input type="number" value={formData.aiUsageLimit} onChange={e => setFormData({...formData, aiUsageLimit: e.target.value})} className="w-full border rounded px-3 py-2 bg-indigo-50" dir="ltr" /></div>
            <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>

      {/* --- RENEW MODAL (New Design) --- */}
      <Modal isOpen={isRenewModalOpen} onClose={() => setIsRenewModalOpen(false)} title="تجديد / تمديد الاشتراك">
          <div className="p-1">
              <p className="text-sm text-gray-500 mb-4 text-center">اختر المدة التي تود إضافتها:</p>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleRenew(30)} className="flex flex-col items-center justify-center p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all group">
                      <CheckCircle className="mb-2 h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-lg">شهر</span>
                      <span className="text-xs opacity-75">+30 يوم</span>
                  </button>
                  <button onClick={() => handleRenew(7)} className="flex flex-col items-center justify-center p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all group">
                      <CheckCircle className="mb-2 h-8 w-8 text-green-500 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-lg">أسبوع</span>
                      <span className="text-xs opacity-75">+7 أيام</span>
                  </button>
              </div>
          </div>
      </Modal>

    </Layout>
  );
};

export default AdminDashboard;
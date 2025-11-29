import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { dbService, SystemConfig } from '../services/dbService';
import { Clinic } from '../types';
import { CheckCircle, XCircle, Calendar, Plus, Trash2, Edit2, Settings, List, Save, Clock, RefreshCcw, Ban, Bot } from 'lucide-react';

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
      socialLinks: { facebook: '', instagram: '', youtube: '' }
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', aiUsageLimit: '50' });

  // Modal State for Renewal
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewClinicId, setRenewClinicId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<string>('');

  useEffect(() => {
    loadClinics();
    loadSettings();
  }, []);

  // Update 1: Make loading async
  const loadClinics = async () => {
    const data = await dbService.getAllClinics();
    setClinics(data);
  };

  const loadSettings = () => {
      setConfig(dbService.getSystemConfig());
  };

  // --- Clinic CRUD Logic ---
  
  const handleDelete = async (clinicId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه العيادة نهائياً؟ سيتم حذف جميع سجلات المرضى والزيارات التابعة لها.')) {
        await dbService.deleteClinic(clinicId);
        await loadClinics(); // Reload after delete
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', email: '', password: '', aiUsageLimit: '50' }); 
    setIsModalOpen(true);
  };

  const openEditModal = (clinic: Clinic) => {
    setModalMode('edit');
    setSelectedClinicId(clinic.id);
    setFormData({ 
        name: clinic.name, 
        email: clinic.email, 
        password: '',
        aiUsageLimit: (clinic.aiUsageLimit || 50).toString() 
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
            // Update 2: Ensure updateClinic exists in dbService
            await dbService.updateClinic(selectedClinicId, {
                name: formData.name, 
                email: formData.email, 
                password: formData.password,
                aiUsageLimit: parseInt(formData.aiUsageLimit) || 50
            });
        }
        setIsModalOpen(false);
        await loadClinics();
    } catch (err) {
        alert(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  // --- Renewal Logic ---

  const openRenewModal = (clinicId: string) => {
      setRenewClinicId(clinicId);
      setCustomDays('');
      setIsRenewModalOpen(true);
  };

  const handleRenew = async (days: number) => {
      if (!renewClinicId) return;
      await dbService.extendSubscription(renewClinicId, days);
      setIsRenewModalOpen(false);
      await loadClinics();
  };

  const handleStopSubscription = async (clinicId: string) => {
      if (confirm('هل أنت متأكد من إلغاء اشتراك هذه العيادة؟ سيتم منع الدخول إليها فوراً.')) {
          await dbService.stopSubscription(clinicId);
          await loadClinics(); 
      }
  };

  // --- Settings Logic ---

  const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      dbService.updateSystemConfig(config);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-IQ', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <Layout title="إدارة النظام (SaaS)" onLogout={onLogout}>
      
      {/* Tabs */}
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">إدارة الاشتراك</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                                <Calendar size={14} className="text-gray-400" />
                                {formatDate(clinic.subscriptionEndDate)}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                             <Button 
                                variant="secondary"
                                size="sm"
                                className="text-xs px-2 py-1 h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                onClick={() => openRenewModal(clinic.id)}
                            >
                                <RefreshCcw size={14} className="ml-1" />
                                تجديد
                            </Button>
                            
                            {clinic.subscriptionActive && (
                                <button
                                    onClick={() => handleStopSubscription(clinic.id)}
                                    className="text-xs px-3 py-1 h-8 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 flex items-center gap-1 transition-colors"
                                    title="إلغاء الاشتراك"
                                >
                                    <Ban size={14} />
                                    إلغاء
                                </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2">
                                <button onClick={() => openEditModal(clinic)} className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded" title="تعديل بيانات العيادة والرصيد">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(clinic.id)} className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded" title="حذف العيادة نهائياً">
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

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
          <div className="max-w-3xl bg-white shadow rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
                  <Settings size={20} />
                  إعدادات النظام والدفع
              </h3>
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                  
                  {/* General Config */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">المظهر العام</h4>
                      <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رابط الشعار المخصص (يظهر في الشريط العلوي)</label>
                            <input
                                type="url"
                                dir="ltr"
                                placeholder="https://example.com/logo.png"
                                value={config.customLogoUrl || ''}
                                onChange={(e) => setConfig({...config, customLogoUrl: e.target.value})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">اتركه فارغاً لاستخدام الشعار الافتراضي.</p>
                      </div>
                  </div>

                  {/* Payment Config */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">إعدادات الدفع (تظهر عند انتهاء الاشتراك)</h4>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">رابط صورة الباركود (QR Code)</label>
                            <input
                                type="url"
                                dir="ltr"
                                value={config.paymentBarcodeUrl}
                                onChange={(e) => setConfig({...config, paymentBarcodeUrl: e.target.value})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                      </div>
                  </div>

                  {/* Social & Contact */}
                  <div className="border-b border-gray-100 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded w-fit">روابط التواصل والدعم الفني</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الواتساب (للدعم الفني)</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="9647700000000"
                                value={config.supportWhatsapp}
                                onChange={(e) => setConfig({...config, supportWhatsapp: e.target.value})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رابط فيسبوك</label>
                            <input
                                type="url"
                                dir="ltr"
                                value={config.socialLinks?.facebook || ''}
                                onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, facebook: e.target.value}})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رابط انستغرام</label>
                            <input
                                type="url"
                                dir="ltr"
                                value={config.socialLinks?.instagram || ''}
                                onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, instagram: e.target.value}})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رابط يوتيوب</label>
                            <input
                                type="url"
                                dir="ltr"
                                value={config.socialLinks?.youtube || ''}
                                onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, youtube: e.target.value}})}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
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
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'add' ? 'إضافة عيادة جديدة' : 'تعديل بيانات العيادة'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">اسم العيادة</label>
                <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input 
                    type="email" 
                    required 
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
                 <input 
                    type="text" 
                    required={modalMode === 'add'}
                    placeholder={modalMode === 'edit' ? "اتركه فارغاً إذا لا تريد التغيير" : "أدخل كلمة المرور"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500" 
                    dir="ltr" 
                />
            </div>
            
            {/* AI Limit Field (Only in Edit Mode usually, but good for Add too) */}
            <div className="pt-2 border-t border-gray-100">
                 <label className="block text-sm font-medium text-indigo-700 mb-1">
                    <span className="flex items-center gap-1"><Bot size={14}/> رصيد الذكاء الاصطناعي (شهرياً)</span>
                 </label>
                 <input 
                    type="number" 
                    min="0"
                    required
                    value={formData.aiUsageLimit}
                    onChange={(e) => setFormData({...formData, aiUsageLimit: e.target.value})}
                    className="mt-1 block w-full border border-indigo-200 rounded-md py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50" 
                    dir="ltr" 
                />
            </div>

            <div className="pt-4">
                <Button type="submit" className="w-full">حفظ البيانات</Button>
            </div>
        </form>
      </Modal>

      {/* --- RENEWAL MODAL --- */}
      <Modal 
        isOpen={isRenewModalOpen} 
        onClose={() => setIsRenewModalOpen(false)} 
        title="تجديد / تمديد الاشتراك"
      >
          <div className="space-y-4">
              <p className="text-sm text-gray-600">اختر مدة التجديد للعيادة المحددة:</p>
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleRenew(7)}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition"
                  >
                      <Clock className="text-green-600 mb-1" />
                      <span className="font-bold text-gray-900">تجريبي (أسبوع)</span>
                      <span className="text-xs text-gray-500">7 أيام</span>
                  </button>

                  <button 
                    onClick={() => handleRenew(30)}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                      <Calendar className="text-blue-600 mb-1" />
                      <span className="font-bold text-gray-900">شهري</span>
                      <span className="text-xs text-gray-500">30 يوم</span>
                  </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">مدة مخصصة (بالأيام)</label>
                  <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="عدد الأيام" 
                        className="flex-1 border border-gray-300 rounded-md px-3"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                      />
                      <Button 
                        onClick={() => handleRenew(parseInt(customDays) || 0)}
                        disabled={!customDays || parseInt(customDays) <= 0}
                      >
                          تفعيل
                      </Button>
                  </div>
              </div>
          </div>
      </Modal>

    </Layout>
  );
};

export default AdminDashboard;
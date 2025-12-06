import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { dbService } from '../services/dbService';
import { Patient } from '../types';
import { Search, UserPlus, FileText, AlertOctagon } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    gender: 'male',
    bloodType: '',
    chronicDiseases: '',
    allergies: '' // حقل جديد
  });
  const [hasAllergies, setHasAllergies] = useState(false); // زر التبديل (نعم/لا)

  useEffect(() => {
    const init = async () => {
        const clinic = dbService.getCurrentClinic();
        if (clinic) {
          setClinicId(clinic.id);
          loadPatients(clinic.id);
        }
    };
    init();
  }, []);

  const loadPatients = async (id: string) => {
    setIsLoading(true);
    try {
        const data = await dbService.getPatients(id);
        setPatients(data || []);
    } catch (error) {
        console.error("Failed to load patients", error);
        setPatients([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    await dbService.addPatient({
      clinicId,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      phone: formData.phone, // اختياري (Supabase يقبل null)
      gender: formData.gender as 'male' | 'female',
      bloodType: formData.bloodType,
      chronicDiseases: formData.chronicDiseases ? formData.chronicDiseases.split(',').map(s => s.trim()) : [],
      allergies: hasAllergies ? formData.allergies : '' // حفظ التحسس فقط إذا تم اختيار "نعم"
    });

    await loadPatients(clinicId);
    setIsModalOpen(false);
    
    // تصفير النموذج
    setFormData({
      name: '',
      age: '',
      phone: '',
      gender: 'male',
      bloodType: '',
      chronicDiseases: '',
      allergies: ''
    });
    setHasAllergies(false);
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(search) || (p.phone && p.phone.includes(search))
  );

  return (
    <Layout title="سجل المرضى" onLogout={onLogout}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <UserPlus size={20} />
          <span>إضافة مريض جديد</span>
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مريض جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">اسم المريض</label>
            <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">العمر</label>
              <input type="number" name="age" required value={formData.age} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الجنس</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم الهاتف (اختياري)</label>
              <input type="text" name="phone" dir="ltr" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">فصيلة الدم</label>
              <input type="text" name="bloodType" dir="ltr" value={formData.bloodType} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" />
            </div>
          </div>

          {/* قسم التحسس الجديد */}
          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
             <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-red-800 flex items-center gap-1">
                    <AlertOctagon size={16} />
                    هل يوجد تحسس دوائي؟
                </label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" checked={hasAllergies} onChange={() => setHasAllergies(true)} className="text-red-600 focus:ring-red-500" />
                        <span className="text-sm text-gray-700">نعم</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" checked={!hasAllergies} onChange={() => setHasAllergies(false)} className="text-gray-600 focus:ring-gray-500" />
                        <span className="text-sm text-gray-700">لا</span>
                    </label>
                </div>
             </div>
             {hasAllergies && (
                <input type="text" placeholder="اكتب نوع التحسس هنا..." name="allergies" value={formData.allergies} onChange={handleInputChange} className="w-full border border-red-300 rounded-md py-2 px-3 focus:ring-red-500 text-sm bg-white" />
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">الأمراض المزمنة</label>
            <input type="text" name="chronicDiseases" placeholder="مثال: سكري, ضغط, ربو" value={formData.chronicDiseases} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" />
          </div>

          <div className="mt-5 sm:mt-6">
            <Button type="submit" className="w-full">حفظ المريض</Button>
          </div>
        </form>
      </Modal>

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العمر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">جاري تحميل البيانات...</td></tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <div className="text-xs text-gray-500">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{patient.age} سنة</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900" dir="ltr">{patient.phone || '-'}</div></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {patient.chronicDiseases.map((d, idx) => (
                            <span key={idx} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{d}</span>
                        ))}
                        {patient.allergies && <span className="block w-full mt-1 text-xs text-red-600 font-bold">تحسس: {patient.allergies}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <button onClick={() => window.location.hash = `#/patient/${patient.id}`} className="text-primary-600 hover:text-primary-900 flex items-center gap-1 bg-primary-50 px-3 py-1 rounded-md">
                        <FileText size={16} /> الملف
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">لا يوجد نتائج.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
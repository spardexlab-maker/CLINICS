import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { dbService } from '../services/dbService';
import { Patient } from '../types';
import { Search, UserPlus, FileText } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    gender: 'male',
    bloodType: '',
    chronicDiseases: ''
  });

  useEffect(() => {
    const clinic = dbService.getCurrentClinic();
    if (clinic) {
      setClinicId(clinic.id);
      loadPatients(clinic.id);
    }
  }, []);

  // --- التعديل 1: انتظار البيانات من Supabase ---
  const loadPatients = async (id: string) => {
    const data = await dbService.getPatients(id);
    // نتأكد أن البيانات مصفوفة وليست خطأ
    if (Array.isArray(data)) {
        setPatients(data);
    } else {
        setPatients([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- التعديل 2: انتظار عملية الحفظ ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    await dbService.addPatient({
      clinicId,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      phone: formData.phone,
      gender: formData.gender as 'male' | 'female',
      bloodType: formData.bloodType,
      chronicDiseases: formData.chronicDiseases ? formData.chronicDiseases.split(',').map(s => s.trim()) : []
    });

    await loadPatients(clinicId); // تحديث القائمة بعد الحفظ
    setIsModalOpen(false);
    
    // Reset Form
    setFormData({
      name: '',
      age: '',
      phone: '',
      gender: 'male',
      bloodType: '',
      chronicDiseases: ''
    });
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(search) || p.phone.includes(search)
  );

  return (
    <Layout title="سجل المرضى" onLogout={onLogout}>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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

      {/* Add Patient Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مريض جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">اسم المريض</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">العمر</label>
              <input
                type="number"
                name="age"
                required
                value={formData.age}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الجنس</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
              <input
                type="text"
                name="phone"
                required
                dir="ltr"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">فصيلة الدم (اختياري)</label>
              <input
                type="text"
                name="bloodType"
                dir="ltr"
                value={formData.bloodType}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">الأمراض المزمنة (افصل بينها بفاصلة)</label>
            <input
              type="text"
              name="chronicDiseases"
              placeholder="مثال: سكري, ضغط, ربو"
              value={formData.chronicDiseases}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div className="mt-5 sm:mt-6">
            <Button type="submit" className="w-full">
              حفظ المريض
            </Button>
          </div>
        </form>
      </Modal>

      {/* Patients Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المريض
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العمر
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الهاتف
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الأمراض المزمنة
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">عرض</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length > 0 ? (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.age} سنة</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" dir="ltr">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {patient.chronicDiseases.length > 0 ? (
                          patient.chronicDiseases.map((d, idx) => (
                            <span key={idx} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <button 
                        onClick={() => window.location.hash = `#/patient/${patient.id}`}
                        className="text-primary-600 hover:text-primary-900 flex items-center gap-1 bg-primary-50 px-3 py-1 rounded-md"
                      >
                        <FileText size={16} />
                        الملف
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    لا يوجد مرضى مطابقين للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
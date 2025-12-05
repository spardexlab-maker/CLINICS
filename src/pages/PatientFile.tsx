import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { dbService } from '../services/dbService';
import { geminiService } from '../services/geminiService';
import { Patient, Visit, AIChatMessage, VitalLog } from '../types';
import Button from '../components/Button';
import { 
  ArrowRight, 
  Calendar, 
  PlusCircle, 
  Bot, 
  Send, 
  History,
  Activity,
  FileText,
  Edit,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Trash,
  AlertTriangle,
  Camera
} from 'lucide-react';

interface PatientFileProps {
  patientId: string;
  onLogout: () => void;
}

const PatientFile: React.FC<PatientFileProps> = ({ patientId, onLogout }) => {
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [allMeds, setAllMeds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Vitals Logic
  const [isVitalModalOpen, setIsVitalModalOpen] = useState(false);
  const [showVitalHistory, setShowVitalHistory] = useState(false);
  const [vitalForm, setVitalForm] = useState({
      bloodPressure: '',
      heartRate: '',
      oxygenLevel: '',
      temperature: '',
      bloodSugar: ''
  });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    age: '',
    phone: '',
    gender: 'male',
    bloodType: '',
    chronicDiseases: ''
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [visitForm, setVisitForm] = useState<{
    diagnosis: string;
    treatment: string;
    notes: string;
    date: string;
    prescriptionImage: string;
  }>({
    diagnosis: '',
    treatment: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    prescriptionImage: ''
  });

  const [medSearch, setMedSearch] = useState('');
  const [filteredMeds, setFilteredMeds] = useState<string[]>([]);
  const [showMedList, setShowMedList] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    const p = await dbService.getPatientById(patientId);
    if (p) {
      setPatient(p);
      const v = await dbService.getPatientVisits(patientId);
      setVisits(v);
      const vl = await dbService.getPatientVitals(patientId);
      setVitals(vl);
      
      // التعديل هنا: انتظار تحميل الأدوية من السيرفر
      const meds = await dbService.getMedications(); 
      setAllMeds(meds);
      
      setEditFormData({
        name: p.name,
        age: p.age.toString(),
        phone: p.phone,
        gender: p.gender,
        bloodType: p.bloodType || '',
        chronicDiseases: p.chronicDiseases.join(', ')
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (medSearch) {
        const matches = allMeds.filter(m => m.toLowerCase().includes(medSearch.toLowerCase()));
        setFilteredMeds(matches);
        setShowMedList(true);
    } else {
        setFilteredMeds([]);
        setShowMedList(false);
    }
  }, [medSearch, allMeds]);

  const handleVitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setVitalForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVitalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!patient) return;

      await dbService.addVital({
          patientId: patient.id,
          date: new Date().toISOString(),
          bloodPressure: vitalForm.bloodPressure || '-',
          heartRate: parseInt(vitalForm.heartRate) || 0,
          oxygenLevel: parseInt(vitalForm.oxygenLevel) || 0,
          temperature: parseFloat(vitalForm.temperature) || 0,
          bloodSugar: parseInt(vitalForm.bloodSugar) || 0
      });

      await loadData();
      setIsVitalModalOpen(false);
      setVitalForm({ bloodPressure: '', heartRate: '', oxygenLevel: '', temperature: '', bloodSugar: '' });
  };

  const latestVital = vitals.length > 0 ? vitals[0] : null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !patient) return;

    // Check Quota Async
    const canUseAI = await dbService.checkAIQuota(patient.clinicId);
    
    if (!canUseAI) {
        const warningMsg: AIChatMessage = { 
            role: 'model', 
            content: "عذراً، لقد تجاوزت الحد المسموح لاستخدام المساعد الذكي لهذا الشهر.", 
            timestamp: Date.now() 
        };
        setChatMessages(prev => [...prev, warningMsg]);
        return;
    }

    const userMsg: AIChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);

    const answer = await geminiService.askMedicalAssistant(userMsg.content, patient, visits);

    const botMsg: AIChatMessage = { role: 'model', content: answer, timestamp: Date.now() };
    setChatMessages(prev => [...prev, botMsg]);
    setIsAiLoading(false);
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    await dbService.addVisit({
      clinicId: patient.clinicId,
      patientId: patient.id,
      date: visitForm.date,
      diagnosis: visitForm.diagnosis,
      treatment: visitForm.treatment,
      notes: visitForm.notes,
      prescriptionImage: visitForm.prescriptionImage
    });

    await loadData();
    setIsModalOpen(false);
    setVisitForm({
      diagnosis: '',
      treatment: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      prescriptionImage: ''
    });
    setMedSearch('');
  };

  const handleVisitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setVisitForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 1024 * 1024 * 5) { // 5MB limit
            alert('حجم الصورة كبير جداً.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setVisitForm(prev => ({ ...prev, prescriptionImage: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  // التعديل هنا: حفظ الدواء الجديد في السحابة
  const addMedicationToVisit = async (med: string) => {
      const currentTreatment = visitForm.treatment;
      const newTreatment = currentTreatment ? `${currentTreatment}, ${med}` : med;
      setVisitForm(prev => ({ ...prev, treatment: newTreatment }));
      
      if (!allMeds.includes(med)) {
          await dbService.addMedication(med); // await here
          setAllMeds(prev => [...prev, med]);
      }
      
      setMedSearch('');
      setShowMedList(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    await dbService.updatePatient(patient.id, {
        name: editFormData.name,
        age: parseInt(editFormData.age) || 0,
        phone: editFormData.phone,
        gender: editFormData.gender as 'male' | 'female',
        bloodType: editFormData.bloodType,
        chronicDiseases: editFormData.chronicDiseases ? editFormData.chronicDiseases.split(',').map(s => s.trim()) : []
    });

    await loadData();
    setIsEditModalOpen(false);
  };

  if (loading || !patient) return <Layout title="جاري التحميل..." onLogout={onLogout}><div className="text-center p-10">جاري جلب البيانات...</div></Layout>;

  return (
    <Layout title={`ملف المريض: ${patient.name}`} onLogout={onLogout}>
      <div className="mb-4 flex justify-between items-center">
        <button 
          onClick={() => window.location.hash = '#/'}
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowRight size={18} className="ml-1" />
          العودة للقائمة
        </button>

        <Button onClick={() => setIsVitalModalOpen(true)} className="flex items-center gap-2">
            <Activity size={18} />
            قياس المؤشرات الحيوية
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-primary-600" size={20} />
                المؤشرات الحيوية (أحدث قراءة)
            </h3>
            {vitals.length > 0 && (
                <span className="text-xs text-gray-500">
                    آخر تحديث: {new Date(latestVital!.date).toLocaleString('ar-IQ')}
                </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                  <div className="text-red-400 mb-1 flex justify-center"><Activity size={20} /></div>
                  <div className="text-xs text-gray-500">ضغط الدم</div>
                  <div className="font-bold text-lg text-gray-900" dir="ltr">{latestVital?.bloodPressure || '-'}</div>
                  <div className="text-[10px] text-gray-400">mmHg</div>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-center">
                  <div className="text-rose-400 mb-1 flex justify-center"><Heart size={20} /></div>
                  <div className="text-xs text-gray-500">النبض</div>
                  <div className="font-bold text-lg text-gray-900">{latestVital?.heartRate || '-'}</div>
                  <div className="text-[10px] text-gray-400">bpm</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                  <div className="text-blue-400 mb-1 flex justify-center"><Wind size={20} /></div>
                  <div className="text-xs text-gray-500">الأوكسجين</div>
                  <div className="font-bold text-lg text-gray-900">{latestVital?.oxygenLevel || '-'}%</div>
                  <div className="text-[10px] text-gray-400">SpO2</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
                  <div className="text-orange-400 mb-1 flex justify-center"><Thermometer size={20} /></div>
                  <div className="text-xs text-gray-500">الحرارة</div>
                  <div className="font-bold text-lg text-gray-900">{latestVital?.temperature || '-'}°</div>
                  <div className="text-[10px] text-gray-400">Celsius</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-emerald-400 mb-1 flex justify-center"><Droplets size={20} /></div>
                  <div className="text-xs text-gray-500">السكري</div>
                  <div className="font-bold text-lg text-gray-900">{latestVital?.bloodSugar || '-'}</div>
                  <div className="text-[10px] text-gray-400">mg/dL</div>
              </div>
          </div>

          {vitals.length > 0 && (
             <div className="mt-4 border-t border-gray-100 pt-2">
                 <button 
                    onClick={() => setShowVitalHistory(!showVitalHistory)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mx-auto"
                 >
                     {showVitalHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                     {showVitalHistory ? 'إخفاء السجل' : 'عرض سجل القياسات السابق'}
                 </button>
                 
                 {showVitalHistory && (
                     <div className="mt-3 overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200 text-sm">
                             <thead>
                                 <tr className="bg-gray-50">
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">التاريخ</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">الضغط</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">النبض</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">الأوكسجين</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">الحرارة</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">السكري</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-100">
                                 {vitals.map(v => (
                                     <tr key={v.id}>
                                         <td className="px-3 py-2 text-gray-900">{new Date(v.date).toLocaleDateString('ar-IQ')} <span className="text-xs text-gray-400">{new Date(v.date).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'})}</span></td>
                                         <td className="px-3 py-2 text-gray-600" dir="ltr">{v.bloodPressure}</td>
                                         <td className="px-3 py-2 text-gray-600">{v.heartRate}</td>
                                         <td className="px-3 py-2 text-gray-600">{v.oxygenLevel}%</td>
                                         <td className="px-3 py-2 text-gray-600">{v.temperature}°</td>
                                         <td className="px-3 py-2 text-gray-600">{v.bloodSugar}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">البيانات الشخصية</h3>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setIsEditModalOpen(true)}
                   className="text-gray-400 hover:text-primary-600 transition-colors"
                   title="تعديل المعلومات"
                 >
                    <Edit size={16} />
                 </button>
                 <span className={`px-2 py-1 text-xs rounded-full ${patient.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                    {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                 </span>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">العمر:</span>
                <span className="font-medium text-gray-900">{patient.age} سنة</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">فصيلة الدم:</span>
                <span className="font-medium text-gray-900">{patient.bloodType || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">الهاتف:</span>
                <span className="font-medium text-gray-900" dir="ltr">{patient.phone}</span>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">الأمراض المزمنة:</span>
                <div className="flex flex-wrap gap-1">
                  {patient.chronicDiseases.length > 0 ? (
                     patient.chronicDiseases.map((d, i) => (
                       <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs border border-red-100">{d}</span>
                     ))
                  ) : <span className="text-gray-400">لا يوجد</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="text-yellow-300" />
                <h3 className="text-lg font-bold">المساعد الطبي الذكي</h3>
              </div>
              <p className="text-indigo-100 text-sm mb-4">
                اسأل الذكاء الاصطناعي عن تاريخ المريض، التفاعلات الدوائية، أو تلخيص الزيارات.
              </p>
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-full bg-white text-indigo-600 py-2 rounded-md font-bold text-sm hover:bg-indigo-50 transition shadow-sm"
              >
                {isChatOpen ? 'إخفاء المحادثة' : 'بدء محادثة مع الملف'}
              </button>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 bg-purple-500 opacity-20 rounded-full blur-xl"></div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          
          {isChatOpen && (
            <div className="bg-white border border-indigo-200 shadow-md rounded-lg flex flex-col h-96">
              <div className="p-4 border-b border-gray-100 bg-indigo-50 flex justify-between items-center rounded-t-lg">
                <span className="font-bold text-indigo-900 flex items-center gap-2">
                   <Bot size={18} />
                   مساعد الممرض
                </span>
                <span className="text-xs text-indigo-500 bg-white px-2 py-1 rounded">Gemini Powered</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatMessages.length === 0 && (
                   <div className="text-center text-gray-400 text-sm mt-8">
                     <p>يمكنك طرح أسئلة مثل:</p>
                     <ul className="mt-2 space-y-1">
                       <li>"هل أخذ المريض مضادات حيوية سابقاً؟"</li>
                       <li>"لخص حالة المريض خلال السنة الماضية"</li>
                       <li>"هل هناك تعارض بين دواء الضغط والسكري؟"</li>
                     </ul>
                   </div>
                )}
                
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-white text-gray-800 border border-gray-200 rounded-tr-none' 
                        : msg.content.includes("تجاوزت الحد المسموح") 
                          ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                          : 'bg-indigo-600 text-white rounded-tl-none'
                    }`}>
                        {msg.content.includes("تجاوزت الحد المسموح") && <AlertTriangle size={16} className="inline mr-1 mb-1"/>}
                        {msg.content}
                    </div>
                  </div>
                ))}
                
                {isAiLoading && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اكتب سؤالك هنا..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <button 
                    type="submit" 
                    disabled={isAiLoading || !chatInput.trim()}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Send size={20} className={isAiLoading ? 'opacity-0' : ''} />
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <History size={20} className="text-gray-500" />
                سجل الزيارات
              </h3>
              <Button 
                variant="secondary" 
                className="text-xs"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusCircle size={16} className="ml-1" />
                زيارة جديدة
              </Button>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {visits.map((visit) => (
                <li key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between mb-2">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0">
                      <Calendar size={16} className="text-primary-500" />
                      <span className="text-sm font-bold text-gray-900">{visit.date}</span>
                    </div>
                    <div className="flex gap-2">
                        {visit.prescriptionImage && (
                            <button
                                onClick={() => setPreviewImage(visit.prescriptionImage || null)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition"
                            >
                                <ImageIcon size={12} />
                                عرض الوصفة
                            </button>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {visit.diagnosis}
                        </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Activity size={12} />
                        العلاج
                      </p>
                      <p className="text-sm text-gray-800 font-medium">{visit.treatment}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                      <p className="text-xs text-yellow-600 mb-1 flex items-center gap-1">
                        <FileText size={12} />
                        ملاحظات
                      </p>
                      <p className="text-sm text-gray-700">{visit.notes}</p>
                    </div>
                  </div>
                </li>
              ))}
              {visits.length === 0 && (
                <li className="p-8 text-center text-gray-500">
                  لا توجد زيارات سابقة لهذا المريض.
                </li>
              )}
            </ul>
          </div>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة زيارة جديدة">
             <form onSubmit={handleVisitSubmit} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">تاريخ الزيارة</label>
                   <input 
                     type="date"
                     name="date"
                     required
                     value={visitForm.date}
                     onChange={handleVisitChange}
                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">التشخيص</label>
                   <input 
                     type="text"
                     name="diagnosis"
                     required
                     value={visitForm.diagnosis}
                     onChange={handleVisitChange}
                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                   />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العلاج الموصوف</label>
                    <div className="relative mb-2">
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                placeholder="ابحث عن دواء أو اكتب دواء جديد..."
                                value={medSearch}
                                onChange={(e) => setMedSearch(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {medSearch && filteredMeds.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => addMedicationToVisit(medSearch)}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap"
                                >
                                    إضافة وحفظ
                                </button>
                            )}
                        </div>
                        {showMedList && filteredMeds.length > 0 && (
                            <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                {filteredMeds.map((med, i) => (
                                    <li 
                                        key={i} 
                                        onClick={() => addMedicationToVisit(med)}
                                        className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm text-gray-700 flex justify-between"
                                    >
                                        {med}
                                        <PlusCircle size={14} className="text-gray-400" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <textarea 
                        name="treatment"
                        required
                        rows={2}
                        value={visitForm.treatment}
                        onChange={handleVisitChange}
                        placeholder="يمكنك تعديل القائمة هنا وإضافة الجرعات..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white text-black font-bold"
                    />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">ملاحظات الممرض</label>
                   <textarea 
                     name="notes"
                     rows={2}
                     value={visitForm.notes}
                     onChange={handleVisitChange}
                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">صورة الوصفة الطبية (اختياري)</label>
                   <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 transition">
                      <div className="space-y-1 text-center">
                        {visitForm.prescriptionImage ? (
                            <div className="relative">
                                <img src={visitForm.prescriptionImage} alt="Preview" className="mx-auto h-32 object-contain" />
                                <button
                                    type="button"
                                    onClick={() => setVisitForm(prev => ({ ...prev, prescriptionImage: '' }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                    <Trash size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                        <span>رفع صورة</span>
                                        <input 
                                            id="file-upload" 
                                            name="file-upload" 
                                            type="file" 
                                            className="sr-only" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            </>
                        )}
                      </div>
                   </div>
                </div>

                <div className="mt-5 sm:mt-6">
                   <Button type="submit" className="w-full">
                     حفظ الزيارة
                   </Button>
                </div>
             </form>
          </Modal>

          <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات المريض">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">اسم المريض</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={editFormData.name}
                  onChange={handleEditChange}
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
                    value={editFormData.age}
                    onChange={handleEditChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">الجنس</label>
                  <select
                    name="gender"
                    value={editFormData.gender}
                    onChange={handleEditChange}
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
                    value={editFormData.phone}
                    onChange={handleEditChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">فصيلة الدم</label>
                  <input
                    type="text"
                    name="bloodType"
                    dir="ltr"
                    value={editFormData.bloodType}
                    onChange={handleEditChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">الأمراض المزمنة</label>
                <input
                  type="text"
                  name="chronicDiseases"
                  placeholder="مثال: سكري, ضغط"
                  value={editFormData.chronicDiseases}
                  onChange={handleEditChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div className="mt-5 sm:mt-6">
                <Button type="submit" className="w-full">
                  حفظ التعديلات
                </Button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={isVitalModalOpen} onClose={() => setIsVitalModalOpen(false)} title="تسجيل مؤشرات حيوية جديدة">
             <form onSubmit={handleVitalSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ضغط الدم (mmHg)</label>
                        <input 
                            type="text" 
                            name="bloodPressure"
                            placeholder="120/80"
                            dir="ltr"
                            value={vitalForm.bloodPressure}
                            onChange={handleVitalChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">النبض (bpm)</label>
                        <input 
                            type="number" 
                            name="heartRate"
                            placeholder="70"
                            value={vitalForm.heartRate}
                            onChange={handleVitalChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">نسبة الأوكسجين (%)</label>
                        <input 
                            type="number" 
                            name="oxygenLevel"
                            placeholder="98"
                            value={vitalForm.oxygenLevel}
                            onChange={handleVitalChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">الحرارة (C°)</label>
                        <input 
                            type="number"
                            step="0.1" 
                            name="temperature"
                            placeholder="37.0"
                            value={vitalForm.temperature}
                            onChange={handleVitalChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">مستوى السكر (mg/dL)</label>
                    <input 
                        type="number" 
                        name="bloodSugar"
                        placeholder="100"
                        value={vitalForm.bloodSugar}
                        onChange={handleVitalChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>

                <div className="mt-5 sm:mt-6">
                    <Button type="submit" className="w-full flex items-center justify-center gap-2">
                        <Activity size={18} />
                        حفظ القراءة
                    </Button>
                </div>
             </form>
          </Modal>

          {previewImage && (
              <div 
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4"
                onClick={() => setPreviewImage(null)}
              >
                  <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center">
                      <button 
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                      >
                          <Trash size={32} className="rotate-45" /> {/* Close Icon */}
                      </button>
                      <img 
                        src={previewImage} 
                        alt="Rx Fullscreen" 
                        className="max-h-[90vh] max-w-full object-contain rounded-lg"
                      />
                      <p className="text-white mt-4 text-sm">اضغط في أي مكان للإغلاق</p>
                  </div>
              </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default PatientFile;
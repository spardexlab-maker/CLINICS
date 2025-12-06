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
  Camera,
  ImageIcon,
  Trash,
  AlertTriangle,
  AlertOctagon
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
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVitalModalOpen, setIsVitalModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // State for Vitals History Toggle
  const [showVitalHistory, setShowVitalHistory] = useState(false);

  // Forms & State
  const [vitalForm, setVitalForm] = useState({ bloodPressure: '', heartRate: '', oxygenLevel: '', temperature: '', bloodSugar: '' });
  const [editFormData, setEditFormData] = useState({ name: '', age: '', phone: '', gender: 'male', bloodType: '', chronicDiseases: '', weight: '' });
  
  // Visit Form & Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasAllergies, setHasAllergies] = useState(false);
  const [visitForm, setVisitForm] = useState<{
    id?: string; diagnosis: string; treatment: string; notes: string; date: string; prescriptionImage: string; allergies: string;
  }>({ diagnosis: '', treatment: '', notes: '', date: new Date().toISOString().split('T')[0], prescriptionImage: '', allergies: '' });

  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Med Picker
  const [medSearch, setMedSearch] = useState('');
  const [filteredMeds, setFilteredMeds] = useState<string[]>([]);
  const [showMedList, setShowMedList] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    const p = await dbService.getPatientById(patientId);
    if (p) {
      setPatient(p);
      setVisits(await dbService.getPatientVisits(patientId));
      setVitals(await dbService.getPatientVitals(patientId));
      setAllMeds(await dbService.getMedications());
      
      setEditFormData({
        name: p.name, age: p.age.toString(), phone: p.phone || '', gender: p.gender, 
        bloodType: p.bloodType || '', chronicDiseases: p.chronicDiseases.join(', '), weight: p.weight?.toString() || ''
      });
    }
    setLoading(false);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);
  useEffect(() => {
    if (medSearch) {
        setFilteredMeds(allMeds.filter(m => m.toLowerCase().includes(medSearch.toLowerCase())));
        setShowMedList(true);
    } else { setFilteredMeds([]); setShowMedList(false); }
  }, [medSearch, allMeds]);

  const latestVital = vitals.length > 0 ? vitals[0] : null;

  // --- Handlers ---
  const handleVitalSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); if (!patient) return;
      await dbService.addVital({
          patientId: patient.id, date: new Date().toISOString(),
          bloodPressure: vitalForm.bloodPressure || '-', heartRate: parseInt(vitalForm.heartRate)||0,
          oxygenLevel: parseInt(vitalForm.oxygenLevel)||0, temperature: parseFloat(vitalForm.temperature)||0, bloodSugar: parseInt(vitalForm.bloodSugar)||0
      });
      await loadData(); setIsVitalModalOpen(false); setVitalForm({ bloodPressure: '', heartRate: '', oxygenLevel: '', temperature: '', bloodSugar: '' });
  };

  const handleVitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setVitalForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddVisit = () => {
      setVisitForm({ diagnosis: '', treatment: '', notes: '', date: new Date().toISOString().split('T')[0], prescriptionImage: '', allergies: '' });
      setHasAllergies(false);
      setIsEditMode(false);
      setIsModalOpen(true);
  };

  const openEditVisit = (visit: Visit) => {
      setVisitForm({
          id: visit.id,
          diagnosis: visit.diagnosis,
          treatment: visit.treatment,
          notes: visit.notes,
          date: visit.date.split('T')[0],
          prescriptionImage: visit.prescriptionImage || '',
          allergies: visit.allergies || ''
      });
      setHasAllergies(!!visit.allergies);
      setIsEditMode(true);
      setIsModalOpen(true);
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!patient) return;
    const finalAllergies = hasAllergies ? visitForm.allergies : '';

    if (isEditMode && visitForm.id) {
       await dbService.updateVisit(visitForm.id, {
          diagnosis: visitForm.diagnosis, treatment: visitForm.treatment, notes: visitForm.notes,
          date: visitForm.date, prescriptionImage: visitForm.prescriptionImage, allergies: finalAllergies
       });
    } else {
       await dbService.addVisit({
          clinicId: patient.clinicId, patientId: patient.id, date: visitForm.date,
          diagnosis: visitForm.diagnosis, treatment: visitForm.treatment, notes: visitForm.notes,
          prescriptionImage: visitForm.prescriptionImage, allergies: finalAllergies
       });
    }
    const v = await dbService.getPatientVisits(patient.id);
    setVisits(v);
    setIsModalOpen(false);
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

  const addMedicationToVisit = async (med: string) => {
      const current = visitForm.treatment;
      setVisitForm(prev => ({ ...prev, treatment: current ? `${current}, ${med}` : med }));
      if (!allMeds.includes(med)) {
          await dbService.addMedication(med);
          setAllMeds(prev => [...prev, med]);
      }
      setMedSearch(''); setShowMedList(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!patient) return;
    await dbService.updatePatient(patient.id, {
        name: editFormData.name, age: parseInt(editFormData.age) || 0, phone: editFormData.phone,
        gender: editFormData.gender as 'male' | 'female', bloodType: editFormData.bloodType,
        chronicDiseases: editFormData.chronicDiseases ? editFormData.chronicDiseases.split(',').map(s => s.trim()) : []
    });
    loadData(); setIsEditModalOpen(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!chatInput.trim() || !patient) return;
    if (!(await dbService.checkAIQuota(patient.clinicId))) {
        setChatMessages(prev => [...prev, { role: 'model', content: "عذراً، انتهى رصيد الذكاء الاصطناعي لهذا الشهر.", timestamp: Date.now() }]);
        return;
    }
    const userMsg: AIChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(''); setIsAiLoading(true);
    const answer = await geminiService.askMedicalAssistant(userMsg.content, patient, visits);
    setChatMessages(prev => [...prev, { role: 'model', content: answer, timestamp: Date.now() }]);
    setIsAiLoading(false);
  };

  if (loading || !patient) return <Layout title="جاري التحميل..." onLogout={onLogout}><div className="p-10 text-center">جاري جلب البيانات...</div></Layout>;

  return (
    <Layout title={`ملف المريض: ${patient.name}`} onLogout={onLogout}>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.hash = '#/'}
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowRight size={18} className="ml-1" />
              العودة للقائمة
            </button>
            {patient.allergies && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 border border-red-200">
                    <AlertOctagon size={16}/> تحسس المريض: {patient.allergies}
                </span>
            )}
        </div>
        <Button onClick={() => setIsVitalModalOpen(true)} className="flex items-center gap-2">
            <Activity size={18} />
            قياس المؤشرات الحيوية
        </Button>
      </div>

      {/* ------------------------- VITALS SECTION RESTORED ------------------------- */}
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
      {/* ------------------------------------------------------------------------- */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200 relative">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">البيانات الشخصية</h3>
                    <button onClick={() => setIsEditModalOpen(true)} className="text-gray-400 hover:text-primary-600">
                        <Edit size={16}/>
                    </button>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">العمر:</span> <span className="font-medium text-gray-900">{patient.age} سنة</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">الهاتف:</span> <span className="font-medium text-gray-900" dir="ltr">{patient.phone || 'غير مسجل'}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">فصيلة الدم:</span> <span className="font-medium text-gray-900">{patient.bloodType || '-'}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">الوزن:</span> <span className="font-medium text-gray-900">{patient.weight ? `${patient.weight} كغم` : '-'}</span></div>
                    <div>
                        <span className="block text-gray-500 mb-1">الأمراض المزمنة:</span>
                        <div className="flex flex-wrap gap-1">
                            {patient.chronicDiseases.length > 0 ? patient.chronicDiseases.map((d, i) => (<span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">{d}</span>)) : <span className="text-gray-400">لا يوجد</span>}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* AI CHAT */}
            {isChatOpen && (
                <div className="bg-white border rounded-lg h-96 flex flex-col shadow-md">
                    <div className="p-3 bg-indigo-50 border-b flex justify-between items-center">
                        <span className="font-bold text-indigo-900 flex items-center gap-2"><Bot size={18}/> مساعد ذكي</span>
                        <span className="text-xs bg-white px-2 py-1 rounded text-indigo-500">Gemini</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`p-3 rounded-lg text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-white border self-start rounded-tr-none text-gray-800' : 'bg-indigo-600 text-white self-end rounded-tl-none'}`}>
                                {msg.content}
                            </div>
                        ))}
                        {isAiLoading && <div className="text-xs text-gray-400 animate-pulse">جاري الكتابة...</div>}
                        <div ref={chatEndRef}/>
                    </div>
                    <div className="p-3 bg-white border-t">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="اسأل عن حالة المريض..."/>
                            <button type="submit" disabled={!chatInput.trim() || isAiLoading} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Send size={20}/></button>
                        </form>
                    </div>
                </div>
            )}
            {!isChatOpen && <button onClick={() => setIsChatOpen(true)} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 transition">فتح المساعد الذكي</button>}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium flex gap-2 text-gray-900"><History size={20} className="text-gray-500"/> سجل الزيارات</h3>
              <Button variant="secondary" className="text-xs" onClick={openAddVisit}>
                <PlusCircle size={16} className="ml-1"/> زيارة جديدة
              </Button>
            </div>
            <ul className="divide-y divide-gray-200">
              {visits.map((visit) => (
                <li key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2 text-primary-600 font-bold">
                          <Calendar size={16} /> <span>{visit.date}</span>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 rounded text-xs">{visit.diagnosis}</span>
                      {visit.allergies && (
                          <span className="bg-red-100 text-red-800 px-2 rounded text-xs border border-red-200 flex items-center gap-1 w-fit">
                              <AlertOctagon size={12}/> تحسس: {visit.allergies}
                          </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                        {visit.prescriptionImage && (
                            <button onClick={() => setPreviewImage(visit.prescriptionImage || null)} className="text-purple-600 hover:bg-purple-50 p-1 rounded" title="عرض الوصفة">
                                <ImageIcon size={18}/>
                            </button>
                        )}
                        <button onClick={() => openEditVisit(visit)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded" title="تعديل">
                            <Edit size={18}/>
                        </button>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1 font-bold">العلاج:</p>
                      <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{visit.treatment}</p>
                  </div>
                  {visit.notes && <p className="text-sm text-gray-500 mt-2 italic">ملاحظات: {visit.notes}</p>}
                </li>
              ))}
              {visits.length === 0 && <li className="p-8 text-center text-gray-500">لا توجد زيارات مسجلة.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Visit Modal (Add/Edit) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "تعديل زيارة" : "إضافة زيارة جديدة"}>
         <form onSubmit={handleVisitSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">تاريخ الزيارة</label>
                <input type="date" value={visitForm.date} onChange={e => setVisitForm({...visitForm, date: e.target.value})} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm" required />
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <label className="flex items-center gap-2 text-sm font-bold text-red-800 mb-2"><AlertOctagon size={16} /> هل يوجد تحسس في هذه الزيارة؟</label>
                <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hasAllergies} onChange={() => setHasAllergies(true)} className="text-red-600"/> <span className="text-sm">نعم</span></label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!hasAllergies} onChange={() => setHasAllergies(false)} className="text-gray-600"/> <span className="text-sm">لا</span></label>
                </div>
                {hasAllergies && <input type="text" placeholder="اكتب نوع التحسس (مثل: Penicillin)..." value={visitForm.allergies} onChange={e => setVisitForm({...visitForm, allergies: e.target.value})} className="w-full border border-red-300 rounded-md p-2 text-sm focus:ring-red-500" />}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">التشخيص</label>
                <input type="text" placeholder="مثال: التهاب لوزتين" value={visitForm.diagnosis} onChange={e => setVisitForm({...visitForm, diagnosis: e.target.value})} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" required />
            </div>
            
            {/* Med Picker */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العلاج الموصوف</label>
                <div className="relative mb-2">
                    <input type="text" placeholder="ابحث عن دواء..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="w-full border border-gray-300 p-2 rounded-md text-sm" />
                    {showMedList && filteredMeds.length > 0 && (
                        <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                            {filteredMeds.map((m,i) => (
                                <li key={i} onClick={() => addMedicationToVisit(m)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0 flex justify-between items-center">
                                    {m} <PlusCircle size={14} className="text-green-600"/>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <textarea rows={3} value={visitForm.treatment} onChange={e => setVisitForm({...visitForm, treatment: e.target.value})} className="w-full border border-gray-300 p-2 rounded-md font-bold text-gray-900 bg-gray-50" placeholder="قائمة العلاجات ستظهر هنا..." required />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">ملاحظات الممرض</label>
                <textarea rows={2} value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
            </div>
            
            <div className="border-t border-gray-200 pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة الوصفة الطبية (اختياري)</label>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="text-xs text-gray-500">اضغط لرفع صورة (PNG, JPG)</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
                {visitForm.prescriptionImage && <p className="text-xs text-green-600 mt-1 text-center">✅ تم اختيار الصورة</p>}
            </div>

            <div className="mt-4 pt-2 border-t border-gray-100">
                <Button type="submit" className="w-full">{isEditMode ? 'حفظ التعديلات' : 'حفظ الزيارة'}</Button>
            </div>
         </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات المريض">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">الاسم</label><input type="text" name="name" required value={editFormData.name} onChange={handleEditChange} className="mt-1 block w-full border p-2 rounded-md" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">العمر</label><input type="number" name="age" required value={editFormData.age} onChange={handleEditChange} className="mt-1 block w-full border p-2 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">الوزن</label><input type="number" name="weight" value={editFormData.weight} onChange={handleEditChange} className="mt-1 block w-full border p-2 rounded-md" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">الهاتف</label><input type="text" name="phone" dir="ltr" value={editFormData.phone} onChange={handleEditChange} className="mt-1 block w-full border p-2 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700">الأمراض المزمنة</label><input type="text" name="chronicDiseases" value={editFormData.chronicDiseases} onChange={handleEditChange} className="mt-1 block w-full border p-2 rounded-md" /></div>
          <Button type="submit" className="w-full mt-4">حفظ التعديلات</Button>
        </form>
      </Modal>

      {/* Vitals Modal */}
      <Modal isOpen={isVitalModalOpen} onClose={() => setIsVitalModalOpen(false)} title="تسجيل مؤشرات حيوية">
          <form onSubmit={handleVitalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm">ضغط الدم</label><input placeholder="120/80" name="bloodPressure" value={vitalForm.bloodPressure} onChange={handleVitalChange} className="w-full border p-2 rounded" dir="ltr"/></div>
                  <div><label className="text-sm">السكري</label><input type="number" name="bloodSugar" value={vitalForm.bloodSugar} onChange={handleVitalChange} className="w-full border p-2 rounded"/></div>
                  <div><label className="text-sm">النبض</label><input type="number" name="heartRate" value={vitalForm.heartRate} onChange={handleVitalChange} className="w-full border p-2 rounded"/></div>
                  <div><label className="text-sm">الاوكسجين</label><input type="number" name="oxygenLevel" value={vitalForm.oxygenLevel} onChange={handleVitalChange} className="w-full border p-2 rounded"/></div>
                  <div><label className="text-sm">الحرارة</label><input type="number" step="0.1" name="temperature" value={vitalForm.temperature} onChange={handleVitalChange} className="w-full border p-2 rounded"/></div>
              </div>
              <Button type="submit" className="w-full mt-2">حفظ القراءة</Button>
          </form>
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setPreviewImage(null)}>
              <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center">
                  <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><Trash size={32} className="rotate-45" /></button>
                  <img src={previewImage} alt="Rx Fullscreen" className="max-h-[90vh] max-w-full object-contain rounded-lg"/>
              </div>
          </div>
      )}
    </Layout>
  );
};
export default PatientFile;
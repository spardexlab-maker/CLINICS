import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import { Patient, Visit, Clinic, VitalLog, FinancialTransaction, SystemConfig } from '../types';

const CURRENT_SESSION_KEY = 'iraqicare_session';

// --- أدوات مساعدة للصور ---

const compressImage = async (imageFile: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.1, 
    maxWidthOrHeight: 1024,
    useWebWorker: true
  };
  try {
    return await imageCompression(imageFile, options);
  } catch (error) {
    console.error("Image compression error:", error);
    return imageFile;
  }
};

const base64ToBlob = async (base64: string): Promise<Blob | null> => {
    try {
        const res = await fetch(base64);
        return await res.blob();
    } catch (e) {
        console.error("Failed to convert base64", e);
        return null;
    }
};

const uploadImageToSupabase = async (base64: string, folder: string): Promise<string | null> => {
    try {
        const blob = await base64ToBlob(base64);
        if (!blob) return null;
        
        const file = new File([blob], "image.jpg", { type: "image/jpeg" });
        const compressed = await compressImage(file);
        // نستخدم طابع زمني لضمان تفرد الاسم
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const { data, error: uploadError } = await supabase.storage
            .from('visit-attachments') 
            .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
            console.error("Upload Error Details:", uploadError);
            alert(`فشل رفع الصورة: ${uploadError.message}`);
            return null;
        }
        
        const { data: urlData } = supabase.storage.from('visit-attachments').getPublicUrl(fileName);
        return urlData.publicUrl;
    } catch (err) {
        console.error("Upload Exception:", err);
        return null;
    }
};

export const dbService = {
  
  // 1. المصادقة
  login: async (email: string, password?: string): Promise<{ success: boolean; clinic?: Clinic; error?: string }> => {
    const { data: clinic, error } = await supabase.from('clinics').select('*').eq('email', email).single();

    if (error || !clinic) return { success: false, error: 'INVALID_CREDENTIALS' };
    if (password && clinic.password !== password) return { success: false, error: 'INVALID_CREDENTIALS' };

    if (clinic.role === 'doctor') {
        const today = new Date();
        const endDate = clinic.subscription_end_date ? new Date(clinic.subscription_end_date) : null;
        if (!clinic.subscription_active || (endDate && today > endDate)) {
            if (clinic.subscription_active) {
                await supabase.from('clinics').update({ subscription_active: false }).eq('id', clinic.id);
            }
            return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
        }
    }

    const sessionClinic: Clinic = {
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        role: clinic.role as 'admin' | 'doctor',
        subscriptionActive: clinic.subscription_active,
        subscriptionEndDate: clinic.subscription_end_date,
        aiUsageCount: clinic.ai_usage_count || 0,
        aiUsageLimit: clinic.ai_limit || 50,
        lastAiUsageReset: clinic.last_ai_usage_reset
    };
    
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(sessionClinic));
    return { success: true, clinic: sessionClinic };
  },

  getCurrentClinic: (): Clinic | null => {
    const session = localStorage.getItem(CURRENT_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  },

  // 2. إدارة العيادات
  getAllClinics: async (): Promise<Clinic[]> => {
      const { data, error } = await supabase.from('clinics').select('*').eq('role', 'doctor').order('created_at', { ascending: false });
      if (error) {
          console.error("Get Clinics Error:", error);
          return [];
      }
      
      return data.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role,
          subscriptionActive: c.subscription_active,
          subscriptionEndDate: c.subscription_end_date,
          aiUsageCount: c.ai_usage_count,
          aiUsageLimit: c.ai_limit,
          lastAiUsageReset: c.last_ai_usage_reset
      }));
  },

  addClinic: async (data: { name: string; email: string; password?: string }) => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);

      const { data: newClinic, error } = await supabase.from('clinics').insert({
          name: data.name,
          email: data.email,
          password: data.password || '123456',
          role: 'doctor',
          subscription_active: true,
          subscription_end_date: date.toISOString(),
          ai_usage_count: 0,
          ai_limit: 50
      }).select().single();

      if (error) {
          alert(`خطأ في الإضافة: ${error.message}`);
          throw new Error(error.message);
      }
      return newClinic;
  },

  updateClinic: async (id: string, data: { name: string; email: string; password?: string; aiUsageLimit?: number; subscriptionEndDate?: string }) => {
      const updates: any = { name: data.name, email: data.email };
      if (data.password && data.password.trim() !== '') updates.password = data.password;
      if (data.aiUsageLimit !== undefined) updates.ai_limit = data.aiUsageLimit;
      if (data.subscriptionEndDate) updates.subscription_end_date = data.subscriptionEndDate;

      const { error } = await supabase.from('clinics').update(updates).eq('id', id);
      if (error) {
          alert(`خطأ في التحديث: ${error.message}`);
          throw new Error(error.message);
      }
  },

  deleteClinic: async (clinicId: string) => {
      const { error } = await supabase.from('clinics').delete().eq('id', clinicId);
      if (error) {
          alert(`خطأ في الحذف: ${error.message}`);
          throw new Error(error.message);
      }
  },

  // تمديد الاشتراك
  extendSubscription: async (clinicId: string, days: number) => {
      const { data: clinic, error: fetchError } = await supabase.from('clinics').select('subscription_end_date').eq('id', clinicId).single();
      
      if (fetchError) {
          alert("لم يتم العثور على العيادة");
          return;
      }

      const now = new Date();
      const currentEnd = clinic?.subscription_end_date ? new Date(clinic.subscription_end_date) : now;
      let startDate = (currentEnd > now) ? currentEnd : now;
      startDate.setDate(startDate.getDate() + days);

      const { error } = await supabase.from('clinics').update({
          subscription_active: true,
          subscription_end_date: startDate.toISOString()
      }).eq('id', clinicId);

      if (error) {
          alert(`فشل التجديد: ${error.message}`);
          throw new Error(error.message);
      }
  },

  // إيقاف الاشتراك
  stopSubscription: async (clinicId: string) => {
      const { error } = await supabase.from('clinics').update({ subscription_active: false }).eq('id', clinicId);
      if (error) {
          alert(`فشل الإيقاف: ${error.message}`);
          throw new Error(error.message);
      }
  },

  // 3. المرضى والزيارات
  getPatients: async (clinicId: string): Promise<Patient[]> => {
      const { data } = await supabase.from('patients').select('*').eq('clinic_id', clinicId);
      return (data || []).map(p => ({
          id: p.id,
          clinicId: p.clinic_id,
          name: p.name,
          age: p.age,
          phone: p.phone,
          gender: p.gender,
          bloodType: p.blood_type,
          chronicDiseases: p.chronic_diseases || [],
          weight: p.weight,
          allergies: p.allergies
      }));
  },

  getPatientById: async (patientId: string): Promise<Patient | undefined> => {
      const { data } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (!data) return undefined;
      return {
          id: data.id,
          clinicId: data.clinic_id,
          name: data.name,
          age: data.age,
          phone: data.phone,
          gender: data.gender,
          bloodType: data.blood_type,
          chronicDiseases: data.chronic_diseases || [],
          weight: data.weight,
          allergies: data.allergies
      };
  },

  addPatient: async (patient: any) => {
      const { error } = await supabase.from('patients').insert({
          clinic_id: patient.clinicId,
          name: patient.name,
          age: patient.age,
          phone: patient.phone || null,
          gender: patient.gender,
          blood_type: patient.bloodType,
          chronic_diseases: patient.chronicDiseases,
          weight: patient.weight,
          allergies: patient.allergies
      });
      if (error) alert(`خطأ في إضافة المريض: ${error.message}`);
  },

  updatePatient: async (id: string, data: any) => {
      await supabase.from('patients').update({
          name: data.name,
          age: data.age,
          phone: data.phone || null,
          gender: data.gender,
          blood_type: data.bloodType,
          chronic_diseases: data.chronicDiseases,
          weight: data.weight,
          allergies: data.allergies
      }).eq('id', id);
  },

  getPatientVisits: async (patientId: string): Promise<Visit[]> => {
      const { data } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false });
      return (data || []).map(v => ({
          id: v.id,
          clinicId: v.clinic_id,
          patientId: v.patient_id,
          date: v.visit_date,
          diagnosis: v.diagnosis,
          treatment: v.treatment,
          notes: v.notes,
          prescriptionImage: v.image_url,
          allergies: v.allergies
      }));
  },

  addVisit: async (visit: any) => {
      let imageUrl = null;
      if (visit.prescriptionImage && visit.prescriptionImage.startsWith('data:')) {
          imageUrl = await uploadImageToSupabase(visit.prescriptionImage, 'visits');
      }
      const { error } = await supabase.from('visits').insert({
          clinic_id: visit.clinicId,
          patient_id: visit.patientId,
          visit_date: visit.date,
          diagnosis: visit.diagnosis,
          treatment: visit.treatment,
          notes: visit.notes,
          image_url: imageUrl,
          allergies: visit.allergies
      });
      if (error) alert(`خطأ في إضافة الزيارة: ${error.message}`);
  },

  updateVisit: async (visitId: string, data: any) => {
      const updates: any = {
          visit_date: data.date,
          diagnosis: data.diagnosis,
          treatment: data.treatment,
          notes: data.notes,
          allergies: data.allergies
      };
      if (data.prescriptionImage && data.prescriptionImage.startsWith('data:')) {
          const newUrl = await uploadImageToSupabase(data.prescriptionImage, 'visits');
          if (newUrl) updates.image_url = newUrl;
      }
      await supabase.from('visits').update(updates).eq('id', visitId);
  },

  getPatientVitals: async (patientId: string): Promise<VitalLog[]> => {
      const { data } = await supabase.from('vital_logs').select('*').eq('patient_id', patientId).order('date', { ascending: false });
      return (data || []).map(v => ({
          id: v.id,
          patientId: v.patient_id,
          date: v.date,
          bloodPressure: v.blood_pressure,
          heartRate: v.heart_rate,
          oxygenLevel: v.oxygen_level,
          temperature: v.temperature,
          bloodSugar: v.blood_sugar
      }));
  },

  addVital: async (data: any) => {
      await supabase.from('vital_logs').insert({
          patient_id: data.patientId,
          date: data.date,
          blood_pressure: data.bloodPressure,
          heart_rate: data.heartRate,
          oxygen_level: data.oxygenLevel,
          temperature: data.temperature,
          blood_sugar: data.bloodSugar
      });
  },

  getMedications: async (): Promise<string[]> => {
      const { data } = await supabase.from('medications').select('name');
      return data ? data.map(m => m.name) : [];
  },

  addMedication: async (name: string) => {
      const { data } = await supabase.from('medications').select('id').eq('name', name).single();
      if (!data) await supabase.from('medications').insert({ name });
      return name;
  },

  getTransactions: async (clinicId: string): Promise<FinancialTransaction[]> => {
      const { data } = await supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId);
      return (data || []).map(t => ({
          id: t.id,
          clinicId: t.clinic_id,
          type: t.type,
          category: t.category,
          amount: t.amount,
          date: t.date,
          description: t.description
      }));
  },

  addTransaction: async (data: any) => {
      await supabase.from('financial_transactions').insert({
          clinic_id: data.clinicId,
          type: data.type,
          category: data.category,
          amount: data.amount,
          date: data.date,
          description: data.description
      });
  },

  deleteTransaction: async (id: string) => {
      await supabase.from('financial_transactions').delete().eq('id', id);
  },

  checkAIQuota: async (clinicId: string): Promise<boolean> => {
      const { data } = await supabase.from('clinics').select('ai_usage_count, ai_limit').eq('id', clinicId).single();
      if (!data) return false;
      return (data.ai_usage_count || 0) < (data.ai_limit || 50);
  },

  incrementAIUsage: async (clinicId: string) => {
      const { data } = await supabase.from('clinics').select('ai_usage_count').eq('id', clinicId).single();
      if (data) await supabase.from('clinics').update({ ai_usage_count: (data.ai_usage_count || 0) + 1 }).eq('id', clinicId);
  },

  // 4. إعدادات النظام (الصور والشعارات)
  getSystemConfig: async (): Promise<SystemConfig> => {
    const { data } = await supabase.from('system_config').select('*').order('id', { ascending: true }).limit(1).single();
    if (!data) return {
       paymentBarcodeUrl: '',
       paymentInstructions: 'يرجى تحويل الاشتراك.',
       supportWhatsapp: '',
       customLogoUrl: '',
       appLogoUrl: '',
       socialLinks: { facebook: '', instagram: '', youtube: '' }
    };
    return {
       paymentBarcodeUrl: data.payment_barcode_url,
       paymentInstructions: data.payment_instructions,
       supportWhatsapp: data.support_whatsapp,
       customLogoUrl: data.custom_logo_url,
       appLogoUrl: data.app_logo_url,
       socialLinks: data.social_links || { facebook: '', instagram: '', youtube: '' }
    };
  },

  updateSystemConfig: async (config: SystemConfig) => {
    // رفع الصور (نتعامل مع كل صورة على حدة)
    let appLogoUrl = config.appLogoUrl;
    let customLogoUrl = config.customLogoUrl;
    let barcodeUrl = config.paymentBarcodeUrl;

    try {
        if (appLogoUrl && appLogoUrl.startsWith('data:')) {
            const url = await uploadImageToSupabase(appLogoUrl, 'config');
            if (url) appLogoUrl = url;
        }
        if (customLogoUrl && customLogoUrl.startsWith('data:')) {
            const url = await uploadImageToSupabase(customLogoUrl, 'config');
            if (url) customLogoUrl = url;
        }
        if (barcodeUrl && barcodeUrl.startsWith('data:')) {
            const url = await uploadImageToSupabase(barcodeUrl, 'config');
            if (url) barcodeUrl = url;
        }

        const { error } = await supabase.from('system_config').upsert({
            id: 1, // دائماً نحدث الصف رقم 1
            payment_barcode_url: barcodeUrl,
            payment_instructions: config.paymentInstructions,
            support_whatsapp: config.supportWhatsapp,
            custom_logo_url: customLogoUrl,
            app_logo_url: appLogoUrl,
            social_links: config.socialLinks
        });

        if (error) {
            console.error("Config Update Error:", error);
            alert(`فشل حفظ الإعدادات: ${error.message}`);
        }
    } catch (e) {
        console.error("System Config Exception:", e);
        alert("حدث خطأ غير متوقع أثناء حفظ الإعدادات");
    }
  }
};
export interface Clinic {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'doctor';
  subscriptionActive: boolean;
  subscriptionEndDate?: string;
  aiUsageCount: number;
  aiUsageLimit: number;
  lastAiUsageReset: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  name: string;
  age: number;
  phone?: string; // أصبح اختيارياً
  gender: 'male' | 'female';
  chronicDiseases: string[];
  bloodType?: string;
  weight?: number;
  allergies?: string; // ميزة جديدة: التحسس
}

export interface Visit {
  id: string;
  clinicId: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  prescriptionImage?: string;
  allergies?: string; // ميزة جديدة: تحسس خاص بالزيارة
}

export interface VitalLog {
  id: string;
  patientId: string;
  date: string;
  bloodPressure: string;
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  bloodSugar: number;
}

export interface FinancialTransaction {
  id: string;
  clinicId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface AIChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface SystemConfig {
  paymentBarcodeUrl: string;
  paymentInstructions: string;
  supportWhatsapp: string;
  customLogoUrl?: string; // اللوجو الثانوي
  appLogoUrl?: string;    // اللوجو الأساسي (بديل السماعة)
  socialLinks: {
    facebook: string;
    instagram: string;
    youtube: string;
  };
}
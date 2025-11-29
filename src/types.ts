
// Data Models
export interface Clinic {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for auth simulation
  role: 'admin' | 'doctor'; // 'admin' = SaaS Owner, 'doctor' = Clinic User
  subscriptionActive: boolean;
  subscriptionEndDate?: string; // ISO Date string
  // AI Quota System
  aiUsageCount: number;
  aiUsageLimit: number;
  lastAiUsageReset: string; // ISO Date string to track monthly reset
}

export interface Patient {
  id: string;
  clinicId: string;
  name: string;
  age: number;
  phone: string;
  gender: 'male' | 'female';
  chronicDiseases: string[];
  bloodType?: string;
}

export interface Visit {
  id: string;
  clinicId: string;
  patientId: string;
  date: string; // ISO Date string
  diagnosis: string;
  treatment: string;
  notes: string;
  prescriptionImage?: string; // Base64 Data URL for the Rx Image
}

export interface VitalLog {
  id: string;
  patientId: string;
  date: string; // ISO Date string (Timestamp)
  bloodPressure: string; // e.g. "120/80"
  heartRate: number; // bpm
  oxygenLevel: number; // %
  temperature: number; // Celsius
  bloodSugar: number; // mg/dL
}

export interface FinancialTransaction {
  id: string;
  clinicId: string;
  type: 'income' | 'expense';
  category: string; // e.g., 'Kashfiya', 'Surgery', 'Rent', 'Equipment'
  amount: number;
  date: string; // ISO Date string
  description: string;
}

// AI Types
export interface AIChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}


import { GoogleGenAI } from "@google/genai";
import { Patient, Visit } from '../types';
import { dbService } from './dbService'; // Import DB Service

/**
 * GEMINI AI SERVICE
 * Simulates the backend route: POST /api/ai-chat
 */

const getApiKey = (): string => {
  // In a real app, strict process.env.API_KEY is used.
  // We assume the environment is set up correctly.
  const key = process.env.API_KEY;
  if (!key) {
    console.error("Gemini API Key is missing!");
    return '';
  }
  return key;
};

export const geminiService = {
  /**
   * Generates a response based on patient history.
   * This logic normally resides in the Node.js backend to secure the prompt engineering.
   */
  askMedicalAssistant: async (
    question: string,
    patient: Patient,
    visits: Visit[]
  ): Promise<string> => {
    
    // 1. Check AI Quota
    const currentClinic = dbService.getCurrentClinic();
    if (!currentClinic) return "خطأ: جلسة غير صالحة.";

    const canUseAI = dbService.checkAIQuota(currentClinic.id);
    if (!canUseAI) {
        return "QUOTA_EXCEEDED"; // Special code to handle in UI
    }

    const apiKey = getApiKey();
    if (!apiKey) return "خطأ: مفتاح API غير موجود.";

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // 2. Construct the Context (The RAG-lite approach)
      const context = `
      أنت مساعد طبي ذكي يدعم الممرضين في العيادات العراقية.
      لديك بيانات المريض التالية وسجل زياراته.
      أجب على سؤال الممرض بدقة بناءً على هذا السجل.
      
      معلومات المريض:
      - الاسم: ${patient.name}
      - العمر: ${patient.age}
      - الجنس: ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}
      - الأمراض المزمنة: ${patient.chronicDiseases.join(', ') || 'لا يوجد'}

      سجل الزيارات (من الأحدث للأقدم):
      ${visits.map(v => `
      - التاريخ: ${v.date}
      - التشخيص: ${v.diagnosis}
      - العلاج: ${v.treatment}
      - ملاحظات: ${v.notes}
      `).join('\n')}

      تعليمات:
      1. أجب باللغة العربية فقط.
      2. كن مختصراً ومباشراً.
      3. إذا لم تجد المعلومة في السجل، قل "لا توجد معلومات في السجل الطبي".
      4. استخدم لهجة طبية مهنية.

      سؤال الممرض: ${question}
      `;

      // 3. Call Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: context, 
        config: {
          temperature: 0.3, 
        }
      });

      // 4. Increment Usage on Success
      if (response.text) {
          dbService.incrementAIUsage(currentClinic.id);
      }

      return response.text || "لم يتمكن النظام من توليد إجابة.";

    } catch (error) {
      console.error("AI Service Error:", error);
      return "عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي.";
    }
  }
};

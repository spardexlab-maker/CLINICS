import { createClient } from '@supabase/supabase-js';

// قراءة المتغيرات من ملف .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من وجود المفاتيح لتجنب الأخطاء
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Key is missing! Check your .env.local file.');
}

// إنشاء وتصدير نسخة الاتصال
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
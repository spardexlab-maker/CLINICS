import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { dbService } from '../services/dbService';
import { FinancialTransaction } from '../types';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Calendar, ArrowLeft } from 'lucide-react';

interface AccountingProps {
    onLogout: () => void;
}

const Accounting: React.FC<AccountingProps> = ({ onLogout }) => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [clinicId, setClinicId] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Summary State
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [netProfit, setNetProfit] = useState(0);

    const [dateRange, setDateRange] = useState({
        from: new Date().toISOString().slice(0, 8) + '01', 
        to: new Date().toISOString().split('T')[0]
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'income',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const clinic = dbService.getCurrentClinic();
        if (clinic) {
            setClinicId(clinic.id);
            loadTransactions(clinic.id);
        }
    }, [dateRange]); 

    const loadTransactions = async (id: string) => {
        setLoading(true);
        const all = await dbService.getTransactions(id);
        
        // Filter by Date Range
        const filtered = all.filter(t => {
            const tDate = t.date.split('T')[0];
            return tDate >= dateRange.from && tDate <= dateRange.to;
        });
        
        setTransactions(filtered);

        const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        setTotalIncome(income);
        setTotalExpense(expense);
        setNetProfit(income - expense);
        setLoading(false);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clinicId) return;

        await dbService.addTransaction({
            clinicId,
            type: formData.type as 'income' | 'expense',
            category: formData.category,
            amount: parseFloat(formData.amount) || 0,
            date: formData.date,
            description: formData.description
        });

        await loadTransactions(clinicId);
        setIsModalOpen(false);
        setFormData({
            type: 'income',
            category: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا السجل المالي؟')) {
            await dbService.deleteTransaction(id);
            if (clinicId) await loadTransactions(clinicId);
        }
    };

    return (
        <Layout title="الإدارة المالية والحسابات" onLogout={onLogout}>
            
            <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Calendar size={20} className="text-primary-600" />
                        <span>عرض السجلات:</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 px-2">من</span>
                        <input 
                            type="date" 
                            value={dateRange.from}
                            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900"
                        />
                    </div>
                    
                    <ArrowLeft size={16} className="text-gray-400 hidden sm:block" />
                    
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 px-2">إلى</span>
                        <input 
                            type="date" 
                            value={dateRange.to}
                            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900"
                        />
                    </div>
                </div>

                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full lg:w-auto justify-center">
                    <Plus size={18} />
                    تسجيل حركة جديدة
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center justify-between transition hover:shadow-md">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">إجمالي الإيرادات</p>
                        <h3 className="text-2xl font-bold text-green-600" dir="ltr">{totalIncome.toLocaleString()} <span className="text-sm font-normal text-gray-400">د.ع</span></h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center justify-between transition hover:shadow-md">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">إجمالي المصروفات</p>
                        <h3 className="text-2xl font-bold text-red-600" dir="ltr">{totalExpense.toLocaleString()} <span className="text-sm font-normal text-gray-400">د.ع</span></h3>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full text-red-600">
                        <TrendingDown size={24} />
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between transition hover:shadow-md ${netProfit >= 0 ? 'border-blue-100' : 'border-orange-100'}`}>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">صافي الربح للفترة</p>
                        <h3 className={`text-2xl font-bold dir="ltr" ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {netProfit.toLocaleString()} <span className="text-sm font-normal text-gray-400">د.ع</span>
                        </h3>
                    </div>
                    <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">سجل العمليات المالية</h3>
                    <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">
                        {transactions.length} عملية
                    </span>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">جاري تحميل البيانات...</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التصنيف</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                                    <th className="px-6 py-3 relative"><span className="sr-only">حذف</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.length > 0 ? transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {t.type === 'income' ? (
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    إيراد
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    مصروف
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-bold">
                                            {t.category}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {t.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" dir="ltr">
                                            {t.amount.toLocaleString()} د.ع
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(t.date).toLocaleDateString('ar-IQ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left">
                                            <button 
                                                onClick={() => handleDelete(t.id)}
                                                className="text-gray-400 hover:text-red-600 transition"
                                                title="حذف السجل"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            لا توجد حركات مالية مسجلة في هذه الفترة الزمنية.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل حركة مالية جديدة">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">نوع الحركة</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="income">إيراد (دخل)</option>
                                <option value="expense">مصروف (خرج)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">التصنيف</label>
                        <input
                            type="text"
                            required
                            list="categories"
                            placeholder={formData.type === 'income' ? 'مثال: كشفية، عملية صغرى' : 'مثال: إيجار، رواتب، كهرباء'}
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <datalist id="categories">
                            <option value="كشفية" />
                            <option value="عملية صغرى" />
                            <option value="تحليل" />
                            <option value="إيجار" />
                            <option value="كهرباء/انترنت" />
                            <option value="مستلزمات طبية" />
                            <option value="رواتب" />
                            <option value="ضيافة" />
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">المبلغ (د.ع)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="250"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">الوصف (اختياري)</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="w-full">
                            حفظ الحركة
                        </Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default Accounting;
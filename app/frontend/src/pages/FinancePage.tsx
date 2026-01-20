import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, RefreshCcw, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import Card from '@/components/ui/Card';
import UniversalTable from '@/components/ui/Table';
import AddExpenseModal from '@/components/AddExpenseModal';

interface FinancialSummary {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: string | number;
}

const FinancePage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [period, setPeriod] = useState('month');
    const [summary, setSummary] = useState<FinancialSummary>({
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: '0',
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchFinancialData();
        }
    }, [period, isAuthenticated]);

    const fetchFinancialData = async () => {
        try {
            setIsLoading(true);

            const [summaryRes, transactionsRes] = await Promise.all([
                api.get(`/finance/summary?period=${period}`),
                api.get('/finance?limit=10'),
            ]);

            setSummary(summaryRes.data.summary);
            setExpensesByCategory(summaryRes.data.expensesByCategory || []);

            // Transform transactions for the table
            const transactions = transactionsRes.data.transactions || [];
            const formattedTransactions = transactions.map((t: any) => ({
                id: t.id,
                date: format(new Date(t.createdAt), 'MMM dd, yyyy'),
                type: t.type,
                category: t.category,
                description: t.description,
                amount: t.amount,
                patientName: t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : 'N/A',
            }));

            setRecentTransactions(formattedTransactions);
            setLastUpdated(new Date());
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch financial data');
        } finally {
            setIsLoading(false);
        }
    };

    const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    const transactionColumns = [
        { label: 'Date', key: 'date' },
        {
            label: 'Type',
            key: 'type',
            render: (row: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.type === 'SALE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {row.type}
                </span>
            )
        },
        { label: 'Category', key: 'category' },
        { label: 'Description', key: 'description' },
        {
            label: 'Amount',
            key: 'amount',
            render: (row: any) => (
                <span className="font-medium">
                    MK{Number(row.amount).toLocaleString()}
                </span>
            )
        }
    ];

    if (isLoading && recentTransactions.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AddExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onSuccess={fetchFinancialData}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-secondary-900">Financial Dashboard</h1>
                    <div className="flex items-center gap-2 text-secondary-600 text-sm">
                        <span>Track revenue, expenses, and profitability</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={() => fetchFinancialData()}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-teal-600"
                            title="Refresh Data"
                        >
                            <RefreshCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 items-center">
                    {['today', 'week', 'month', 'year'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p
                                ? 'bg-teal-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}

                    <div className="h-8 w-px bg-gray-200 mx-1"></div>

                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Revenue"
                    count={`MK${Number(summary.revenue).toLocaleString()}`}
                    Icon={<DollarSign className="w-5 h-5 text-teal-600" />}
                />
                <Card
                    title="Total Expenses"
                    count={`MK${Number(summary.expenses).toLocaleString()}`}
                    Icon={<TrendingDown className="w-5 h-5 text-red-600" />}
                />
                <Card
                    title="Net Profit"
                    count={`MK${Number(summary.profit).toLocaleString()}`}
                    Icon={<TrendingUp className={`w-5 h-5 ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
                />
                <Card
                    title="Profit Margin"
                    count={`${summary.profitMargin}%`}
                    Icon={<AlertCircle className="w-5 h-5 text-blue-600" />}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-md font-bold text-secondary-900 mb-4">Expenses by Category</h2>
                    {expensesByCategory.length > 0 ? (
                        <div className="h-64 flex justify-center">
                            <ResponsiveContainer width="100%" height="100%" style={{ fontSize: '12px' }}>
                                <PieChart>
                                    <Pie
                                        data={expensesByCategory}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ category, total }) => `${category}: MK${Number(total).toLocaleString()}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="total"
                                        nameKey="category"
                                    >
                                        {expensesByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `MK${Number(value).toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-secondary-500">
                            No expense data available
                        </div>
                    )}
                </div>

                {/* Profit Overview */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-md font-bold text-secondary-900 mb-4">Profit Overview</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-secondary-700">Revenue</span>
                            <span className="font-bold text-green-600">
                                MK{Number(summary.revenue).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-secondary-700">Expenses</span>
                            <span className="font-bold text-red-600">
                                -MK{Number(summary.expenses).toLocaleString()}
                            </span>
                        </div>
                        <div className="border-t pt-4 flex justify-between items-center">
                            <span className="font-bold text-secondary-900">Net Profit</span>
                            <span className={`font-bold text-xl ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                MK{Number(summary.profit).toLocaleString()}
                            </span>
                        </div>
                        <div className="mt-6 p-4 bg-teal-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-teal-900">Profit Margin</span>
                                <span className="text-2xl font-bold text-teal-700">{summary.profitMargin}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-secondary-900">Recent Transactions</h2>
                </div>

                {recentTransactions.length > 0 ? (
                    <UniversalTable
                        columns={transactionColumns}
                        data={recentTransactions}
                    />
                ) : (
                    <div className="text-center py-12 text-secondary-500">
                        No transactions found
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancePage;

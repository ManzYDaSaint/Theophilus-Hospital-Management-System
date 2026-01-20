import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Activity, DollarSign } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';

interface AnalyticsData {
    summary: {
        totalPatients: number;
        totalVisits: number;
        revenue: number;
        expenses: number;
        profit: number;
        profitMargin: string;
    };
    trends: {
        revenue: Array<{ date: string; total: number }>;
        visits: Array<{ date: string; count: number }>;
    };
    demographics: Array<{ gender: string; _count: { gender: number } }>;
    topDiagnoses: Array<{ description: string; count: number }>;
}

const AnalyticsPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAnalytics();
        }
    }, [period, isAuthenticated]);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);

            const [dashboardRes, expenseRes] = await Promise.all([
                api.get(`/analytics/dashboard?period=${period}`),
                api.get(`/analytics/expense-breakdown?period=${period}`),
            ]);

            setData(dashboardRes.data);
            setExpenseBreakdown(expenseRes.data.breakdown || []);
        } catch (error) {
            toast.error('Failed to fetch analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    // Process demographics for chart
    const demographicsData = data.demographics?.map(d => ({
        name: d.gender || 'Unknown',
        value: d._count.gender
    })) || [];

    // Process diagnoses for chart
    const diagnosesData = data.topDiagnoses?.map(d => ({
        name: d.description,
        value: Number(d.count) // ensure number
    })) || [];


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-secondary-900">Hospital Analytics</h1>
                    <p className="text-secondary-600 text-sm">Comprehensive insights and trends</p>
                </div>

                {/* Period selector */}
                <div className="flex gap-2">
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
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Patients"
                    count={data.summary.totalPatients}
                    Icon={<Users className="w-5 h-5 text-blue-600" />}
                />
                <Card
                    title="Total Visits"
                    count={data.summary.totalVisits}
                    Icon={<Activity className="w-5 h-5 text-green-600" />}
                />
                <Card
                    title="Total Revenue"
                    count={`MK${Number(data.summary.revenue).toLocaleString()}`}
                    Icon={<DollarSign className="w-5 h-5 text-teal-600" />}
                />
                <Card
                    title="Net Profit"
                    count={`MK${Number(data.summary.profit).toLocaleString()}`}
                    Icon={<TrendingUp className={`w-5 h-5 ${data.summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
                />
            </div>

            {/* Main Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trends Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trends</h2>
                    {data.trends.revenue.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.trends.revenue}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        fontSize={12}
                                    />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        formatter={(value: any) => [`MK${Number(value).toLocaleString()}`, 'Revenue']}
                                        labelFormatter={(date: any) => new Date(date).toLocaleDateString()}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#0d9488"
                                        strokeWidth={2}
                                        name="Revenue"
                                        dot={{ fill: '#0d9488', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No revenue data available</div>
                    )}
                </div>

                {/* Visit Trends */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Visit Trends</h2>
                    {data.trends.visits.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.trends.visits}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        fontSize={12}
                                    />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        labelFormatter={(date: any) => new Date(date).toLocaleDateString()}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" name="Visits" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No visit data available</div>
                    )}
                </div>
            </div>

            {/* Secondary Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Expense Breakdown</h2>
                    {expenseBreakdown.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="total"
                                        nameKey="category"
                                    >
                                        {expenseBreakdown.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any, name: any) => [`MK${Number(value).toLocaleString()}`, name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No expense data available</div>
                    )}
                </div>

                {/* Patient Demographics */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Patient Demographics</h2>
                    {demographicsData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={demographicsData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {demographicsData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No patient data available</div>
                    )}
                </div>

                {/* Top Diagnoses */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Top Diagnoses</h2>
                    {diagnosesData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={diagnosesData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" fontSize={12} />
                                    <YAxis type="category" dataKey="name" width={100} fontSize={10} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Cases" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No diagnosis data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;

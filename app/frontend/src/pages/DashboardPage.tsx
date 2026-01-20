import React, { useEffect, useState } from 'react';
import { Users, Activity, Pill, AlertCircle, TrendingUp, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';
import Card from '@/components/ui/Card';

interface DashboardStats {
    totalPatients: number;
    totalVisits: number;
    activePrescriptions: number;
    revenue: number;
}

const DashboardPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        totalVisits: 0,
        activePrescriptions: 0,
        revenue: 0
    });
    const [visitTrends, setVisitTrends] = useState<any[]>([]);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [serverInfo, setServerInfo] = useState<{ url: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboardData();
        }
    }, [isAuthenticated]);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const [analyticsRes, pharmacyRes] = await Promise.all([
                api.get('/analytics/dashboard?period=month'),
                api.get('/pharmacy/low-stock').catch(() => ({ data: [] }))
            ]);

            const summary = analyticsRes.data.summary;
            setStats({
                totalPatients: summary.totalPatients || 0,
                totalVisits: summary.totalVisits || 0,
                activePrescriptions: summary.activePrescriptions || 0,
                revenue: summary.revenue || 0
            });
            setVisitTrends(analyticsRes.data.trends?.visits || []);
            setVisitTrends(analyticsRes.data.trends?.visits || []);
            setLowStockCount(pharmacyRes.data.length || 0);

            if (user?.role === 'Admin') {
                try {
                    const systemRes = await api.get('/system/info');
                    setServerInfo(systemRes.data);
                } catch (err) {
                    console.error('Failed to fetch system info');
                }
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome section */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.firstName}!
                </h1>
                <p className="mt-1 text-gray-500">
                    Here's an overview of your hospital's operations
                </p>
            </div>
            {/* Server Access Info (Admin Only) */}
            {user?.role === 'Admin' && serverInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center shadow-sm">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                        <Wifi className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-blue-900">LAN Access Available</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Access this system from other devices on the network: {' '}
                            <code className="bg-white px-2 py-1 rounded border border-blue-200 font-mono font-bold select-all text-blue-800">
                                {serverInfo.url}
                            </code>
                        </p>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Patients"
                    count={stats.totalPatients}
                    Icon={<Users className="w-5 h-5 text-blue-600" />}
                />
                <Card
                    title="Month's Visits"
                    count={stats.totalVisits}
                    Icon={<Activity className="w-5 h-5 text-green-600" />}
                />
                <Card
                    title="Active Prescriptions"
                    count={stats.activePrescriptions}
                    Icon={<Pill className="w-5 h-5 text-indigo-600" />}
                />
                <Card
                    title="Low Stock Items"
                    count={lowStockCount}
                    Icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visit Trends Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Visit Trends (Last 30 Days)</h2>
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                    </div>
                    {visitTrends.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={visitTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => {
                                            const date = new Date(str);
                                            return `${date.getDate()}/${date.getMonth() + 1}`;
                                        }}
                                        fontSize={12}
                                    />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                        formatter={(value) => [value, 'Visits']}
                                    />
                                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-gray-400">
                            No visit data available yet
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => (window.location.href = '/patients')}
                            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 group"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">Register New Patient</span>
                        </button>
                        <button
                            onClick={() => (window.location.href = '/prescriptions')}
                            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 group"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">Add New Prescription</span>
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">System Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Server</span>
                                <span className="flex items-center text-green-600 gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                    Online
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Database</span>
                                <span className="text-gray-700 font-medium">Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;

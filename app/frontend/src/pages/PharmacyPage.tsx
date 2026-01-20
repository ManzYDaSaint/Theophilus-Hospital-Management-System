import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Plus, Edit2, Package, RefreshCcw } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import AddMedicationModal from '@/components/AddMedicationModal';
import UniversalTable from '@/components/ui/Table';
import ReorderModal from '@/components/ReorderModal';
import Card from '@/components/ui/Card';

interface PharmacyAnalytics {
    sales: {
        total: number;
        count: number;
        averageTransaction: string | number;
    };
    profitability: {
        revenue: number;
        estimatedCost: number;
        profit: number;
        profitMargin: string | number;
    };
    inventory: {
        totalCostValue: number;
        totalSellingValue: number;
        lowStockItems: number;
        lowStockDetails: Array<{
            medicationName: string;
            currentStock: number;
            minimumStock: number;
            restockCost: number;
        }>;
    };
    topMedications: Array<{
        medication: string;
        prescriptionCount: number;
        totalQuantity: number;
        totalRevenue: number;
        sellingPrice: number;
    }>;
}

const PharmacyPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory'>('dashboard');
    const [period, setPeriod] = useState('month');
    const [analytics, setAnalytics] = useState<PharmacyAnalytics | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [categories, setCategories] = useState<string[]>([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showReorderModal, setShowReorderModal] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
            fetchCategories();
        }

        // Poll every 30 seconds
        const intervalId = setInterval(() => {
            if (isAuthenticated && activeTab === 'dashboard') {
                fetchPharmacyAnalytics(true); // silent refresh
            }
        }, 30000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, activeTab, period]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (activeTab === 'inventory' && isAuthenticated) {
                fetchInventory(); // Fetch triggered by generic deps or explicit call, refine dependencies if needed
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [statusFilter, categoryFilter, activeTab, isAuthenticated]); // Added filters to dep array

    const fetchData = async () => {
        if (activeTab === 'dashboard') {
            await fetchPharmacyAnalytics();
        } else {
            await fetchInventory();
        }
        setLastUpdated(new Date());
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/pharmacy/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchPharmacyAnalytics = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const response = await api.get(`/pharmacy/analytics?period=${period}`);
            setAnalytics(response.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch pharmacy analytics', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (categoryFilter !== 'All') params.category = categoryFilter;

            const response = await api.get('/pharmacy', { params });

            // Transform for table
            const data = response.data.map((item: any) => ({
                id: item.id,
                medicationName: item.medicationName,
                category: item.category || 'N/A',
                stock: item.currentStock,
                minStock: item.minimumStock,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                status: item.currentStock <= item.minimumStock ? 'Low Stock' : 'In Stock',
                expiry: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
                original: item // Keep original for editing
            }));

            setInventory(data);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
            toast.error('Failed to fetch inventory');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditMedication = (med: any) => {
        setSelectedMedication(med);
        setShowModal(true);
    };

    const handleReorder = (med: any) => {
        setSelectedMedication(med);
        setShowReorderModal(true);
    };

    const inventoryColumns = [
        { label: 'Medication', key: 'medicationName' },
        { label: 'Category', key: 'category' },
        {
            label: 'Stock',
            key: 'stock',
            render: (row: any) => (
                <span className={`font-medium ${row.stock <= row.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {row.stock}
                </span>
            )
        },
        {
            label: 'Cost',
            key: 'costPrice',
            render: (row: any) => `MK${Number(row.costPrice).toFixed(2)}`
        },
        {
            label: 'Selling Price',
            key: 'sellingPrice',
            render: (row: any) => `MK${Number(row.sellingPrice).toFixed(2)}`
        },
        { label: 'Expiry', key: 'expiry' },
        {
            label: 'Status',
            key: 'status',
            render: (row: any) => {
                let color = 'bg-green-100 text-green-800';
                if (row.stock === 0) color = 'bg-red-100 text-red-800';
                else if (row.stock <= row.minStock) color = 'bg-yellow-100 text-yellow-800';
                else if (row.expiry !== 'N/A' && new Date(row.original.expiryDate) < new Date()) color = 'bg-orange-100 text-orange-800'; // Logic check for expiry UI

                // Backend handles status calculation for filtering, but UI can refine display
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                        {row.status}
                    </span>
                );
            }
        },
        {
            label: 'Actions',
            key: 'actions',
            render: (row: any) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleReorder(row.original)}
                        className="p-1 hover:bg-teal-50 rounded text-teal-600 flex items-center gap-1 text-xs font-medium px-2 py-1 bg-teal-50/50 border border-teal-100"
                        title="Restock"
                    >
                        <Plus className="w-3 h-3" /> Restock
                    </button>
                    <button
                        onClick={() => handleEditMedication(row.original)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Edit Details"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
        <div className="space-y-6">
            <AddMedicationModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedMedication(null);
                }}
                onSuccess={fetchData}
                medicationToEdit={selectedMedication}
            />

            <ReorderModal
                isOpen={showReorderModal}
                onClose={() => {
                    setShowReorderModal(false);
                    setSelectedMedication(null);
                }}
                onSuccess={fetchData}
                medication={selectedMedication}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-secondary-900">Pharmacy Management</h1>
                    <div className="flex items-center gap-2 text-secondary-600 text-sm">
                        <span>Manage inventory, prices, and view analytics</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={() => fetchData()}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-teal-600"
                            title="Refresh Data"
                        >
                            <RefreshCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'inventory' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Inventory
                    </button>
                </div>
            </div>

            {activeTab === 'dashboard' ? (
                <>
                    {/* Dashboard Content */}
                    {analytics ? (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-end">
                                <div className="flex gap-2">
                                    {['today', 'week', 'month', 'year'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${period === p
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
                                    title="Total Sales"
                                    count={`MK${Number(analytics.sales.total).toLocaleString()}`}
                                    Icon={<DollarSign className="w-5 h-5 text-teal-600" />}
                                />

                                <Card
                                    title="Profit Margin"
                                    count={analytics.profitability.profitMargin}
                                    Icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                                />

                                <Card
                                    title="Stock Value (Sell)"
                                    count={`MK${Number(analytics.inventory.totalSellingValue || 0).toLocaleString()}`}
                                    Icon={<Package className="w-5 h-5 text-teal-600" />}
                                />

                                <Card
                                    title="Low Stock Items"
                                    count={analytics.inventory.lowStockItems}
                                    Icon={<AlertTriangle className="w-5 h-5 text-teal-600" />}
                                />
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-md font-bold text-gray-900 mb-6">Top Selling Medications</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%" style={{ fontSize: '12px' }}>
                                            <BarChart data={analytics.topMedications.slice(0, 5)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis type="number" />
                                                <YAxis dataKey="medication" type="category" width={100} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value: any) => [`MK${value}`, 'Revenue']} />
                                                <Bar dataKey="totalRevenue" fill="#0d9488" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-md font-bold text-secondary-900 mb-4">Sales Performance</h3>
                                    <div className="flex items-center justify-center h-full">
                                        {/* Pie Chart for visual aesthetic in Sales Performance */}
                                        <ResponsiveContainer width="100%" height={250} style={{ fontSize: '12px' }}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.topMedications.slice(0, 6)}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    // label={({ medication }: any) => medication.length > 10 ? medication.substring(0, 10) : medication}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="totalRevenue"
                                                    nameKey="medication"
                                                >
                                                    {analytics.topMedications.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64">
                            {isLoading ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div> : <p>No data available</p>}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6 animate-fadeIn">
                    {/* Inventory Tab */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm"
                            >
                                <option value="All">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="available">Available</option>
                                <option value="low_stock">Low Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedMedication(null);
                                setShowModal(true);
                            }}
                            className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" /> Add Medication
                        </button>
                    </div>

                    {isLoading && inventory.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                        </div>
                    ) : (
                        <UniversalTable
                            columns={inventoryColumns}
                            data={inventory}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default PharmacyPage;


import React, { useEffect, useState } from 'react';
import { Pill, Activity, CheckCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import ChartContainer from '@/components/ui/ChartContainer';
import UniversalTable from '@/components/ui/Table';
import AddPrescriptionModal from '@/components/AddPrescriptionModal';

interface Prescription {
    id: string;
    visit: {
        patient: {
            firstName: string;
            lastName: string;
        };
    };
    doctor: {
        firstName: string;
        lastName: string;
    };
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    status: string;
    createdAt: string;
    [key: string]: any;
}

interface Stats {
    counts: {
        total: number;
        active: number;
        completed: number;
        cancelled: number;
    };
    charts: {
        status: { name: string; value: number }[];
        topMedications: { name: string; value: number }[];
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const PrescriptionsPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (isAuthenticated) {
                fetchPrescriptions();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, []);

    const fetchData = () => {
        fetchPrescriptions();
        fetchStats();
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/prescriptions/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const fetchPrescriptions = async () => {
        try {
            const response = await api.get('/prescriptions', {
                params: {
                    limit: 50,
                },
            });
            const data = response.data.prescriptions || [];

            // Transform data for table
            const transformedData = data.map((item: any, index: number) => ({
                ...item,
                sr: index + 1,
                patientName: `${item.visit.patient.firstName} ${item.visit.patient.lastName}`,
                doctorName: `Dr. ${item.doctor.firstName} ${item.doctor.lastName}`,
                date: new Date(item.createdAt).toLocaleDateString(),
            }));

            setPrescriptions(transformedData);
        } catch (error) {
            toast.error('Failed to fetch prescriptions');
        } finally {
            setIsLoading(false);
        }
    };

    const columns = [
        { label: 'SR', key: 'sr' },
        { label: 'Date', key: 'date' },
        { label: 'Patient', key: 'patientName' },
        { label: 'Doctor', key: 'doctorName' },
        { label: 'Medication', key: 'medication' },
        { label: 'Dosage', key: 'dosage' },
        { label: 'Freq', key: 'frequency' },
        {
            label: 'Status',
            key: 'status',
            render: (row: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                    row.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {row.status}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <AddPrescriptionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onPrescriptionAdded={fetchData}
            />

            <Header
                onClick={() => setShowAddModal(true)}
                label='New Prescription'
                HeaderTitle='Prescriptions'
                HeaderPara='Manage patient prescriptions and medications'
            />

            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card Icon={<Pill className='w-8 h-8 text-teal-500' />} count={stats?.counts.total || 0} title="Total Prescriptions" />
                <Card Icon={<Activity className='w-8 h-8 text-blue-500' />} count={stats?.counts.active || 0} title="Active" />
                <Card Icon={<CheckCircle className='w-8 h-8 text-green-500' />} count={stats?.counts.completed || 0} title="Completed" />
                <Card Icon={<XCircle className='w-8 h-8 text-red-500' />} count={stats?.counts.cancelled || 0} title="Cancelled" />
            </div>

            {/* Charts */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                <ChartContainer title="Top Medications">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.charts.topMedications || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Prescriptions" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Status Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stats?.charts.status || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {(stats?.charts.status || []).map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Search and Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            ) : prescriptions.length === 0 ? (
                <div className="text-center py-12 border-2 border-teal-500/20 rounded-lg">
                    <p className="text-secondary-600">No prescriptions found</p>
                </div>
            ) : (
                <UniversalTable
                    columns={columns}
                    data={prescriptions}
                />
            )}
        </div>
    );
};

export default PrescriptionsPage;

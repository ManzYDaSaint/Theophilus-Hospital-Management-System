import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import React, { useEffect, useState } from 'react';
import { UserIcon, Stethoscope, Calendar, Baby, Pencil } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/ui/PageHeader';
import AddPatientModal from '@/components/AddPatientModal';
import Card from '@/components/ui/Card';
import ChartContainer from '@/components/ui/ChartContainer';
import UniversalTable from '@/components/ui/Table';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    createdAt: string;
    sr?: number;
    [key: string]: string | number | undefined; // Index signature for TableData compatibility
}

interface Stats {
    counts: {
        total: number;
        newThisMonth: number;
        lessThanFive: number;
        moreThanFive: number;
    };
    charts: {
        gender: { name: string; value: number }[];
        attendance: { name: string; visits: number }[];
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const PatientsPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPatients();
            fetchStats();
        }
    }, [isAuthenticated]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/patients/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/patients', {
                params: { limit: 50 },
            });
            const patientsData = response.data.patients || [];
            const patientsWithSr = patientsData.map((patient: any, index: number) => ({
                ...patient,
                sr: index + 1,
                dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : ''
            }));
            setPatients(patientsWithSr);
        } catch (error) {
            toast.error('Failed to fetch patients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (patient: Patient) => {
        setSelectedPatient(patient);
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this patient?')) {
            try {
                await api.delete(`/patients/${id}`);
                toast.success('Patient deleted successfully');
                fetchPatients();
                fetchStats(); // Refresh stats after delete
            } catch (error) {
                toast.error('Failed to delete patient');
            }
        }
    };

    const columns = [
        { label: 'SR', key: 'sr' },
        { label: 'First Name', key: 'firstName' },
        { label: 'Last Name', key: 'lastName' },
        { label: 'Date of Birth', key: 'dateOfBirth' },
        { label: 'Gender', key: 'gender' },
        { label: 'Phone', key: 'phoneNumber' },
        {
            label: 'Actions',
            key: 'actions',
            render: (row: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6">
            {/* Add Patient Modal */}
            <AddPatientModal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setSelectedPatient(null);
                }}
                onPatientAdded={() => {
                    fetchPatients();
                    fetchStats(); // Refresh stats after add
                }}
                patient={selectedPatient}
            />
            {/* Header */}
            <Header
                onClick={() => setShowAddModal(true)}
                label='Add Patient'
                HeaderTitle='Patients Management'
                HeaderPara='Manage patients records & information'
            />

            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card Icon={<Stethoscope className='w-8 h-8 text-teal-500' />} count={stats?.counts.total || 0} title="All Patients" />
                <Card Icon={<Calendar className='w-8 h-8 text-teal-500' />} count={stats?.counts.newThisMonth || 0} title="This Month" />
                <Card Icon={<Baby className='w-8 h-8 text-teal-500' />} count={stats?.counts.lessThanFive || 0} title="Less 5" />
                <Card Icon={<UserIcon className='w-8 h-8 text-teal-500' />} count={stats?.counts.moreThanFive || 0} title="Over 5" />
            </div>

            {/* Chart */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                <div className='col-span-3'>
                    <ChartContainer title="Patients Daily Attendance">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats?.charts.attendance || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="visits" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                <div className='col-span-1'>
                    <ChartContainer title="Patients By Gender">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={stats?.charts.gender || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(stats?.charts.gender || []).map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </div>

            {/* Patients table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            ) : patients.length === 0 ? (
                <div className="text-center py-12 border-2 border-teal-500/20 rounded-lg">
                    <p className="text-secondary-600">No patients found</p>
                </div>
            ) : (
                <UniversalTable
                    columns={columns}
                    data={patients}
                />
            )}
        </div>
    );
};

export default PatientsPage;

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Shield } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import UniversalTable from '@/components/ui/Table';
import UserModal from '@/components/UserModal';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    isActive: boolean;
    role: {
        id: string;
        name: string;
    };
    created_at: string;
    [key: string]: any; // Add index signature for UniversalTable
}

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            try {
                await api.delete(`/users/${id}`);
                toast.success('User deleted successfully');
                fetchUsers();
            } catch (error: any) {
                toast.error(error.response?.data?.error || 'Failed to delete user');
            }
        }
    };

    const columns = [
        {
            key: 'user',
            label: 'User',
            render: (user: User) => (
                <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold mr-3">
                        {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                        <div className="text-gray-500 text-xs flex items-center mt-0.5">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            label: 'Role',
            render: (user: User) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role.name === 'Admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role.name}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (user: User) => (
                <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (user: User) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEditUser(user)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit User"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete User"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
                    <p className="text-gray-500 text-sm">Manage system access and roles</p>
                </div>
                <button
                    onClick={handleAddUser}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New User
                </button>
            </div>

            <UniversalTable
                columns={columns}
                data={users}
                loading={isLoading}
                emptyMessage="No users found"
            />

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchUsers}
                userToEdit={selectedUser ? {
                    ...selectedUser,
                    roleId: selectedUser.role.id,
                    password: '' // Ensure password is empty string, not undefined
                } : null}
            />
        </div>
    );
};

export default UsersPage;

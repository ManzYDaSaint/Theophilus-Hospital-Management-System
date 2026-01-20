import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Pill,
    FileText,
    X,
    LogOut,
    User,
    BarChart2,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Logo from '@/components/assets/logo.png'

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    setIsOpen,
    isCollapsed,
    setIsCollapsed
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Logout failed');
        }
    };

    const navigation = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['Admin'] },
        { name: 'Patients', icon: Stethoscope, path: '/patients', roles: ['Admin', 'Doctor', 'Nurse', 'Receptionist'] },
        { name: 'Prescriptions', icon: FileText, path: '/prescriptions', roles: ['Admin', 'Doctor', 'Pharmacist'] },
        { name: 'Pharmacy', icon: Pill, path: '/pharmacy/analytics', roles: ['Admin', 'Pharmacist'] },
        { name: 'Finances', icon: Briefcase, path: '/finance', roles: ['Admin'] },
        { name: 'Analytics', icon: BarChart2, path: '/analytics', roles: ['Admin'] },
        { name: 'Users', icon: User, path: '/users', roles: ['Admin'] },
    ];

    const filteredNavigation = navigation.filter((item) =>
        user ? item.roles.includes(user.role) : false
    );

    return (
        <div
            className={`
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                fixed inset-y-0 left-0 z-50 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            `}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-secondary-200`}>
                    <div className="flex items-center overflow-hidden">
                        <div className="flex-shrink-0 w-10 h-10">
                            <img src={Logo} alt='logo' className='w-full h-full object-contain' />
                        </div>
                        <span className={`ml-3 text-lg font-bold text-secondary-900 duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                            Theophilus
                        </span>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-secondary-600 hover:text-secondary-900"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Desktop Collapse Toggle - Hidden on mobile */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex items-center justify-center p-1 rounded-md hover:bg-secondary-100 text-secondary-500 transition-colors ${isCollapsed ? 'absolute -right-3 top-20 bg-white border shadow-sm rounded-full' : ''}`}
                    >
                        {/* We can put a specific icon or absolute positioned toggle here if we want a different style, 
                             currently using a simple internal toggle or we can make a 'collapse' button at the bottom equivalent.
                             Let's actually put a nice chevron toggle on the border for collapsed state logic or keep it simple.
                         */}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
                    {filteredNavigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={item.name}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsOpen(false);
                                }}
                                title={isCollapsed ? item.name : ''}
                                className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer group
                                    ${isActive
                                        ? 'bg-teal-50 text-teal-500 shadow-sm'
                                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                                    }
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-teal-500' : 'text-secondary-400 group-hover:text-secondary-600'} ${isCollapsed ? '' : 'mr-3'}`} />
                                <span className={`whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                                    {item.name}
                                </span>

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-secondary-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                        {item.name}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer / User Info */}
                <div className="p-4 border-t border-secondary-200">
                    {/* Desktop Collapse Toggle Button (Bottom) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex w-full items-center justify-center mb-4 p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                            <div className="flex items-center w-full">
                                <ChevronLeft className="w-5 h-5 mr-2" />
                                <span className="text-sm font-medium">Collapse Sidebar</span>
                            </div>
                        )}
                    </button>

                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-3 overflow-hidden`}>
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className={`ml-3 transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                                <p className="text-sm font-medium text-secondary-900 truncate max-w-[120px]">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-secondary-500">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium text-danger-700 hover:bg-danger-50 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                        <span className={`whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            Logout
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

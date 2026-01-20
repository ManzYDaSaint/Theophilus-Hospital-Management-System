import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
    Menu,
    Stethoscope,
    HeartPulse,
    Dna,
    Microscope,
    Activity,
    Brain,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    return (
        <div className="h-screen flex relative overflow-hidden bg-gray-50">

            {/* Background Pattern Icons */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Top Left Area */}
                <Stethoscope className="absolute w-32 h-32 -left-8 top-10 text-teal-500/5 rotate-12 z-0" />
                <HeartPulse className="absolute w-24 h-24 left-20 top-40 text-secondary-400/5 -rotate-12 z-0" />

                {/* Top Right Area */}
                <Dna className="absolute w-40 h-40 -right-10 top-20 text-teal-500/5 -rotate-12 z-0" />
                <Microscope className="absolute w-20 h-20 right-32 top-10 text-secondary-400/5 rotate-45 z-0" />

                {/* Bottom Left Area */}
                <Activity className="absolute w-28 h-28 left-10 bottom-20 text-teal-500/5 rotate-6 z-0" />
                <Brain className="absolute w-16 h-16 left-40 bottom-10 text-secondary-400/5 -rotate-6 z-0" />

                {/* Bottom Right Area */}
                <Stethoscope className="absolute w-24 h-24 right-10 bottom-40 text-secondary-400/5 rotate-45 opacity-50 z-0" />
                <HeartPulse className="absolute w-32 h-32 -right-8 -bottom-8 text-teal-500/5 -rotate-12 z-0" />
            </div>

            {/* Sidebar Component */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden z-10">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-secondary-200">
                    <div className="flex items-center justify-between h-16 px-6">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden text-secondary-600 hover:text-secondary-900"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex items-center space-x-4 ml-auto">
                            <div className="text-sm">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                                    <span className="w-2 h-2 bg-success-500 rounded-full mr-2"></span>
                                    System Active
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default DashboardLayout;

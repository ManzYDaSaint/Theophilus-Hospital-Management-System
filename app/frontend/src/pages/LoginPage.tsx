import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/ui/input';
import Liner from '@/components/ui/liner';
import { Activity, Brain, Dna, HeartPulse, Loader2, Microscope, Stethoscope } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);

        try {
            await login(email, password);
            toast.success('Login successful');
            navigate('/');
        } catch (error: any) {
            // Error already handled by axios interceptor
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Pattern Icons */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Top Left Area */}
                <Stethoscope className="absolute w-32 h-32 -left-8 top-10 text-teal-500/10 rotate-12" />
                <HeartPulse className="absolute w-24 h-24 left-20 top-40 text-secondary-400/10 -rotate-12" />

                {/* Top Right Area */}
                <Dna className="absolute w-40 h-40 -right-10 top-20 text-teal-500/10 -rotate-12" />
                <Microscope className="absolute w-20 h-20 right-32 top-10 text-secondary-400/10 rotate-45" />

                {/* Bottom Left Area */}
                <Activity className="absolute w-28 h-28 left-10 bottom-20 text-teal-500/10 rotate-6" />
                <Brain className="absolute w-16 h-16 left-40 bottom-10 text-secondary-400/10 -rotate-6" />

                {/* Bottom Right Area */}
                <Stethoscope className="absolute w-24 h-24 right-10 bottom-40 text-secondary-400/10 rotate-45 opacity-50" />
                <HeartPulse className="absolute w-32 h-32 -right-8 -bottom-8 text-teal-500/10 -rotate-12" />
            </div>
            <div className="max-w-md w-full">
                <div className="p-8">

                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold text-secondary-900">Welcome Back</h2>
                        <Liner />
                        <p className="mt-2 text-sm text-secondary-600">Sign in to access your account</p>
                    </div>

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email Address"
                            id="email"
                            type="email"
                            autoComplete="email"
                            required value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            placeholder="example@mail.com"
                        />

                        <Input
                            label="Password"
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            placeholder="**********"
                        />

                        {/* Remember me and forgot password */}
                        <div className='flex items-center justify-between text-sm'>
                            <div className='flex items-center gap-2'>
                                <input type="checkbox" id="remember" />
                                <label htmlFor="remember" className='text-gray-500'>Remember me</label>
                            </div>
                            <Link to="/forgot-password" className='text-teal-500 hover:text-teal-600'>Forgot password?</Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-1/2 mx-auto flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-secondary-500">
                            Theophilus Clinic Management System v1.0
                        </p>
                        <p className="text-xs text-secondary-500 mt-1">Running in offline mode</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

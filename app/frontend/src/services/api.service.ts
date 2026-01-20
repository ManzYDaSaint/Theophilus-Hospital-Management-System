import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';

declare global {
    interface Window {
        electron?: {
            getApiPort: () => Promise<number>;
        };
    }
}

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    async (config) => {
        // Handle Electron environment dynamic port
        if (window.electron) {
            try {
                const port = await window.electron.getApiPort();
                const url = `http://127.0.0.1:${port}/api`;
                console.log(`[API] Using backend URL: ${url}`);
                config.baseURL = url;
            } catch (error) {
                console.error('Failed to get backend port', error);
            }
        }

        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    toast.error(data.error || 'Session expired. Please login again.');
                    break;

                case 403:
                    toast.error(data.error || 'Access denied');
                    break;

                case 404:
                    toast.error(data.error || 'Resource not found');
                    break;

                case 500:
                    toast.error(data.error || 'Server error. Please try again.');
                    break;

                default:
                    toast.error(data.error || 'An error occurred');
            }
        } else if (error.request) {
            toast.error('Network error. Please check your connection.');
        } else {
            toast.error('An unexpected error occurred');
        }

        return Promise.reject(error);
    }
);

export default api;

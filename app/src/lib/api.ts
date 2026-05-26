import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const SERVER_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');

export const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${SERVER_URL}${imagePath}`;
};

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors and retry
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // If config does not exist or retry option is not set, reject
        if (!config || config.retry === 0) {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        // Set the variable for keeping track of the retry count
        config.retryCount = config.retryCount || 0;

        // Check if we've maxed out the total number of retries
        if (config.retryCount >= (config.retry || 3)) {
            return Promise.reject(error);
        }

        // Increase the retry count
        config.retryCount += 1;

        // Create new promise to handle exponential backoff
        const backoff = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, config.retryDelay || 1000);
        });

        // Return the promise in which recalls axios to retry the request
        await backoff;
        return api(config);
    }
);

export default api;

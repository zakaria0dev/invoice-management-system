import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from './use-toast';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useAutoLogout = () => {
    const { user, logout } = useAppStore();
    const { toast } = useToast();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const resetTimer = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (user) {
                timeoutRef.current = setTimeout(() => {
                    logout();
                    toast({
                        title: "Session Expired",
                        description: "You have been logged out due to 30 minutes of inactivity.",
                        variant: "destructive",
                    });
                    // App.tsx ProtectedRoute will handle the actual redirect once 'user' is null
                    // But a hard redirect ensures it happens even if the app state is stuck
                    window.location.href = '/login';
                }, INACTIVITY_TIMEOUT);
            }
        };

        if (!user) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            return;
        }

        const handleActivity = () => {
            resetTimer();
        };

        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Initialize timer
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            // Cleanup
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, logout, toast]);
};

// resources/js/components/EchoProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally
if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
}

interface EchoContextType {
    echo: Echo | null;
    isConnected: boolean;
}

const EchoContext = createContext<EchoContextType | undefined>(undefined);

export function EchoProvider({ children }: { children: ReactNode }) {
    const [echo, setEcho] = useState<Echo | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (window.Echo) {
            setEcho(window.Echo);
            setIsConnected(true);
            console.log('✅ Echo already configured');
            return;
        }

        try {
            const echoInstance = new Echo({
                broadcaster: 'pusher',
                key: import.meta.env.VITE_PUSHER_APP_KEY,
                cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
                forceTLS: true,
                enabledTransports: ['ws', 'wss'],
            });

            window.Echo = echoInstance;
            setEcho(echoInstance);
            setIsConnected(true);
            console.log('✅ Echo configured successfully');
        } catch (error) {
            console.error('❌ Failed to configure Echo:', error);
        }

        return () => {
            if (window.Echo) {
                try {
                    window.Echo.disconnect();
                } catch (e) {}
                window.Echo = null;
            }
        };
    }, []);

    return (
        <EchoContext.Provider value={{ echo, isConnected }}>
            {children}
        </EchoContext.Provider>
    );
}

export function useEcho() {
    const context = useContext(EchoContext);
    if (context === undefined) {
        throw new Error('useEcho must be used within an EchoProvider');
    }
    return context;
}
// resources/js/components/AppWrapper.tsx
import { ReactNode } from 'react';
// import { NotificationProvider } from './NotificationProvider';
import { Toaster } from 'react-hot-toast';

interface AppWrapperProps {
    children: ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
    return (
        <>
      
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 5000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 5000,
                        iconTheme: {
                            primary: '#4ade80',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            {children}
        </>
    );
}
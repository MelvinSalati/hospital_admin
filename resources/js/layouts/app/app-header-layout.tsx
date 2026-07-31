// resources/js/layouts/app/app-sidebar-layout.tsx
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';
import { EchoProvider } from '@/components/EchoProvider';

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    return (
        <EchoProvider>
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                {children}
            </AppLayoutTemplate>
        </EchoProvider>
    );
}
// resources/js/layouts/app/app-sidebar-layout.tsx
import { EchoProvider } from '@/components/EchoProvider';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    return (
        <EchoProvider>
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                {children}
            </AppLayoutTemplate>
        </EchoProvider>
    );
}
// resources/js/layouts/app/app-sidebar-layout.tsx (or wherever your layout is)
import { EchoProvider } from '@/components/EchoProvider';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        <EchoProvider>
            {children}
        </EchoProvider>
    </AppLayoutTemplate>
);
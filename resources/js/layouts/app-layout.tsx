// resources/js/layouts/app-layout.tsx
import { EchoProvider } from '@/components/EchoProvider';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { useApiToken } from '@/hooks/use-api-token' // ← add
import type { AppLayoutProps } from '@/types';

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    useApiToken(); // ← add this line inside the component body

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            <EchoProvider>{children}</EchoProvider>
        </AppLayoutTemplate>
    );
};

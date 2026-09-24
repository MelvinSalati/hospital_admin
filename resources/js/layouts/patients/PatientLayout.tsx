'use client';

import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import AppSidebarHeader from '@/components/app-sidebar-header';
import PatientHeader from '@/components/patient-header';
import { PatientSidebar } from '@/components/patient-sidebar';
import type { AppLayoutProps } from '@/types';

interface PageProps {
    patient: any;
    departments?: any[];
    users?: any[];
    services?: any[];
    insuranceProviders?: any[];
    visit_status?: {
        has_active_visit: boolean;
        visit_token: string | null;
        token_details?: any;
    };
    auth?: { user?: { id: number; name: string; email: string } };
    [key: string]: any;
}

// ✅ Extend the layout props with our two callbacks
interface PatientLayoutProps extends AppLayoutProps {
    onAssignClick?: () => void;
    onStartVisitClick?: () => void;
}

export default function PatientLayout({
    children,
    breadcrumbs = [],
    onAssignClick, // ✅ accept
    onStartVisitClick, // ✅ accept
}: PatientLayoutProps) {
    const { props } = usePage<PageProps>();

    return (
        <AppShell variant="sidebar">
            <PatientSidebar patient={props.patient} />

            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />

                <PatientHeader
                    patient={props.patient}
                    departments={props.departments ?? []}
                    users={props.users ?? []}
                    services={props.services ?? []}
                    visitToken={props.visit_status?.visit_token ?? null}
                    hasActiveVisit={
                        props.visit_status?.has_active_visit ?? false
                    }
                    onAssignClick={onAssignClick} // ✅ forward
                    onStartVisitClick={onStartVisitClick} // ✅ forward
                />

                {children}
            </AppContent>
        </AppShell>
    );
}

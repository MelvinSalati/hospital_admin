'use client';

import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';

import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { PatientSidebar } from '@/components/patient-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import PatientHeader from '@/components/patient-header';
import type { AppLayoutProps } from '@/types';

// ✅ Define PageProps including patient
interface PageProps {
    patient: Patient;
    [key: string]: any; // allows other props safely
}

export default function PatientLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { props } = usePage<PageProps>();

    return (
        <AppShell variant="sidebar">
            <PatientSidebar patient={props.patient} />

            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />

                <PatientHeader patient={props.patient} />

                {children}
            </AppContent>
        </AppShell>
    );
}

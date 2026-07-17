// pages/pharmacies/dispensed.tsx

import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import DispensedDrugsTable from './components/DispensedDrugsTable';
import { usePage } from '@inertiajs/react';

interface DispensedDrug {
    id: string;
    invoiceNumber: string;
    patientName: string;
    products: {
        name: string;
        quantity: number;
    }[];
    totalQuantity: number;
    totalAmount: number;
    status: 'completed' | 'pending' | 'cancelled';
    date: string;
    patientId?: string;
    patientAge?: number;
    patientGender?: string;
    patientPhone?: string;
    patientEmail?: string;
    prescribedBy?: string;
    dispensedBy?: string;
    subtotal?: number;
    notes?: string;
}

export default function Dispensed() {
    const { dispensed } = usePage<{ dispensed: DispensedDrug[] }>().props;

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Pharmacy',
                    href: '/pharmacy/dashboard',
                },
                {
                    title: 'Dispensed',
                    href: '/pharmacy/dispensed',
                },
            ]}
        >
            <PageHeader
                title="Dispensed Medications"
                subtitle="View all dispensed medications and prescriptions"
            />
            <DispensedDrugsTable transactions={dispensed} />
        </AppLayout>
    );
}

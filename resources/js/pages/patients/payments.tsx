// pages/patients/Payments.tsx
import { usePage } from '@inertiajs/react';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { PaymentsPage } from './components/payments';

export default function Payments() {
    const invoice = usePage().props;
    console.log(invoice);
    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Payments', href: '' },
            ]}
        >
            <PaymentsPage />
        </PatientLayout>
    );
}

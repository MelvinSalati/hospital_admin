// pages/patients/Payments.tsx
import PatientLayout from '@/layouts/patients/PatientLayout';
import { PaymentsPage } from './components/payments';
import { usePage } from '@inertiajs/react';

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

// pages/patients/Theater.tsx
import PatientLayout from '@/layouts/patients/PatientLayout';
import PreviousOrdersTable, {
    CartItem,
} from './components/PreviousOrdersTable';
import { usePage, router } from '@inertiajs/react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix'; 

// ─── Page props coming from the Laravel controller ────────────────────────────
interface TheaterProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
    }>;
    previousOrders: Array<{
        id: string;
        token: string;
        service_type: string;
        total_amount: number;
        status: 'pending' | 'completed' | 'cancelled';
        created_at: string;
    }> | null;
}

export default function Theater() {
    const { patientId, services, previousOrders } =
        usePage<TheaterProps>().props;

    /**
     * Called when the ServiceModal saves.
     * POSTs to Laravel via Inertia and lets the page reload with fresh data.
     */

    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        const response = await Http.post(
            `patients/${identifier}/theater-order`,
            {
                patient_id: identifier,
                services: items.map((item) => ({
                    id: item.id,
                    service_name: item.service_name,
                    service_category: item.service_category,
                    price: item.price,
                    quantity: item.quantity,
                    notes: item.notes ?? null,
                    priority: item.priority || 'routine',
                })),
            },
        );

        if (response.status === 200 || response.status === 201) {
            Notiflix.Notify.success('response.data.mesage');
            router.reload({ only: ['previousOrders'] });
        }
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Theater', href: '/' },
                { title: 'Procedures', href: '/' },
            ]}
        >
            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Theater Procedures
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track all procedures for this patient.
                    </p>
                </div>

                <PreviousOrdersTable
                    patientId={patientId}
                    services={services}
                    previousOrders={previousOrders}
                    onSaveOrder={handleSaveOrder}
                    orderLabel="Procedure"
                />
            </div>
        </PatientLayout>
    );
}

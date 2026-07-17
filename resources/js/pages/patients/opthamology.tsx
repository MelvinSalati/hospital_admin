// pages/patients/Opthamology.tsx
import PatientLayout from '@/layouts/patients/PatientLayout';
import PreviousOrdersTable, {
    CartItem,
} from './components/PreviousOrdersTable';
import { usePage, router } from '@inertiajs/react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';

// ─── Page props coming from the Laravel controller ────────────────────────────
interface OpthamologyProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
    }>;
    previousOrders: Array<{
        id: string;
        order_number: string;
        service_name: string;
        service_category: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        status: 'pending' | 'completed' | 'cancelled';
        priority?: string;
        created_at: string;
    }> | null;
}

export default function Opthamology() {
    const { patientId, services, previousOrders } =
        usePage<OpthamologyProps>().props;

    /**
     * Called when the ServiceModal saves.
     * POSTs to Laravel via Inertia and lets the page reload with fresh data.
     */
    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        const response = await Http.post(
            `patients/${identifier}/opthamology-order`,
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
                { title: 'Opthamology', href: '/' },
                { title: 'Services', href: '/' },
            ]}
        >
            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Opthamology Services
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track all eye care procedures and services
                        for this patient.
                    </p>
                </div>

                <PreviousOrdersTable
                    patientId={patientId}
                    services={services}
                    previousOrders={previousOrders}
                    onSaveOrder={handleSaveOrder}
                    orderLabel="Service"
                />
            </div>
        </PatientLayout>
    );
}

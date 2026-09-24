// pages/patients/dental.tsx
import { usePage, router } from '@inertiajs/react';
import { Plus, Smile } from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { CartItem } from './components/PreviousOrdersTable';
import PreviousOrdersTable from './components/PreviousOrdersTable';

// ─── Page props coming from the Laravel controller ────────────────────────────
interface DentalProps {
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

export default function Dental() {
    const { patientId, services, previousOrders } =
        usePage<DentalProps>().props;

    // Controlled modal state — the trigger lives in PageHeader
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    /**
     * Called when the ServiceModal saves.
     * POSTs to Laravel and lets the page reload with fresh data.
     */
    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        try {
            const response = await Http.post(
                `patients/${identifier}/dental-order`,
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
                Notiflix.Notify.success(
                    response.data?.message ?? 'Order saved',
                );
                router.reload({ only: ['previousOrders'] });
            } else {
                Notiflix.Notify.failure(
                    response.data?.message ?? 'Failed to save order.',
                );
            }
        } catch (error: any) {
            console.error('Dental order failed:', error);
            Notiflix.Notify.failure(
                error?.response?.data?.message ||
                    'Failed to save dental order. Please try again.',
            );
        }
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Dental', href: '/' },
                { title: 'Procedures', href: '/' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<Smile className="h-6 w-6" />}
                    title="Dental Procedures"
                    subtitle="Order and track dental procedures for this patient"
                    actions={[
                        {
                            label: 'Order Procedure',
                            icon: <Plus className="h-4 w-4" />,
                            onClick: () => setIsOrderModalOpen(true),
                        },
                    ]}
                />

                <div className="rounded-sm bg-white p-4">
                    <PreviousOrdersTable
                        patientId={patientId}
                        services={services}
                        previousOrders={previousOrders}
                        onSaveOrder={handleSaveOrder}
                        orderLabel="Procedure"
                        isOrderModalOpen={isOrderModalOpen}
                        onOrderModalClose={() => setIsOrderModalOpen(false)}
                    />
                </div>
            </div>
        </PatientLayout>
    );
}

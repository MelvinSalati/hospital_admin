// pages/patients/Opthamology.tsx
import { usePage, router } from '@inertiajs/react';
import { Eye, Plus } from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { CartItem } from './components/PreviousOrdersTable';
import PreviousOrdersTable from './components/PreviousOrdersTable';

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

    // Controlled modal state — the trigger lives in PageHeader
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    /**
     * Called when the ServiceModal saves.
     * POSTs to Laravel via Inertia and lets the page reload with fresh data.
     */
    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        try {
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
                Notiflix.Notify.success(
                    response.data?.message ||
                        'Ophthalmology order saved successfully',
                );
                router.reload({ only: ['previousOrders'] });
            } else {
                Notiflix.Notify.failure(
                    response.data?.message ||
                        'Failed to save ophthalmology order.',
                );
            }
        } catch (error: any) {
            console.error('Ophthalmology order failed:', error);
            Notiflix.Notify.failure(
                error?.response?.data?.message ||
                    'Failed to save ophthalmology order. Please try again.',
            );
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
            <div className="h-full space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<Eye className="h-6 w-6" />}
                    title="Ophthalmology Services"
                    subtitle="Order and track eye care procedures and services for this patient"
                    actions={[
                        {
                            label: 'Order Service',
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
                        orderLabel="Service"
                        isOrderModalOpen={isOrderModalOpen}
                        onOrderModalClose={() => setIsOrderModalOpen(false)}
                    />
                </div>
            </div>
        </PatientLayout>
    );
}

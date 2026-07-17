// pages/patients/MCH.tsx
import PatientLayout from '@/layouts/patients/PatientLayout';
import PreviousOrdersTable, {
    CartItem,
} from './components/PreviousOrdersTable';
import { usePage, router } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';
// ─── Page props coming from the Laravel controller ────────────────────────────
interface MCHProps {
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
    antenatalVisits?: Array<any>;
    postnatalVisits?: Array<any>;
    childHealthRecords?: Array<any>;
}

export default function MCH() {
    const {
        patientId,
        services,
        previousOrders,
        antenatalVisits,
        postnatalVisits,
        childHealthRecords,
    } = usePage<MCHProps>().props;

    const [activeTab, setActiveTab] = useState<
        'antenatal' | 'postnatal' | 'child_health'
    >('antenatal');
    console.log(previousOrders);
    /**
     * Called when the ServiceModal saves.
     * POSTs to Laravel via Inertia and lets the page reload with fresh data.
     */
    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        try {
            // Make sure each item has the required fields

            const response = await Http.post(
                `patients/${identifier}/martenal-orders`,
                {
                    patient_id: identifier,
                    type: 'antenatal',
                    services: items.map((item) => ({
                        id: item.id, // This is service_id
                        service_name: item.service_name,
                        service_category: item.service_category || 'Imaging',
                        price: item.price,
                        quantity: item.quantity || 1,
                        notes: item.notes ?? null,
                        priority: item.priority || 'routine',
                        modality: item.modality || null,
                        body_part: item.body_part || null,
                        total_amount: (item.price || 0) * (item.quantity || 1), // Add total_amount
                    })),
                },
            );
            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message || 'Order saved successfully',
                );
                router.reload({ only: ['previousOrders'] });
            } else if (response.data.status === 400) {
                Notiflix.Notify.failure(response.data.message);
            }
        } catch (error) {
            Notiflix.Notify.failure('You have already initialized antenatal!!');
        }
    };

    // Get the order label based on active tab
    const getOrderLabel = (): string => {
        switch (activeTab) {
            case 'antenatal':
                return 'Antenatal Service';
            case 'postnatal':
                return 'Postnatal Service';
            case 'child_health':
                return 'Child Health Service';
            default:
                return 'Service';
        }
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'MCH', href: '/' },
                { title: 'Services', href: '/' },
            ]}
        >
            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Maternal & Child Health Services
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track all maternal and child health services
                        for this patient.
                    </p>
                </div>

                <Tabs
                    defaultValue="antenatal"
                    className="w-full"
                    onValueChange={(value) => setActiveTab(value as any)}
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="antenatal">
                            Antenatal Care
                        </TabsTrigger>
                        <TabsTrigger value="postnatal">
                            Postnatal Care
                        </TabsTrigger>
                        <TabsTrigger value="child_health">
                            Child Health
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="antenatal" className="mt-6">
                        <PreviousOrdersTable
                            patientId={patientId}
                            services={services}
                            previousOrders={previousOrders}
                            onSaveOrder={handleSaveOrder}
                            orderLabel={getOrderLabel()}
                        />

                        {/* Optional: Display antenatal visits if available */}
                        {antenatalVisits && antenatalVisits.length > 0 && (
                            <div className="mt-8">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Antenatal Visit History
                                </h3>
                                <div className="overflow-hidden rounded-lg border">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Visit Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Gestational Age
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Risk Level
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Next Visit
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {antenatalVisits.map(
                                                (visit: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.visit_date}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {
                                                                visit.gestational_age_weeks
                                                            }{' '}
                                                            weeks
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${
                                                                    visit.risk_level ===
                                                                    'high'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : visit.risk_level ===
                                                                            'medium'
                                                                          ? 'bg-yellow-100 text-yellow-800'
                                                                          : 'bg-green-100 text-green-800'
                                                                }`}
                                                            >
                                                                {visit.risk_level ||
                                                                    'Normal'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.next_visit_date ||
                                                                'N/A'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="postnatal" className="mt-6">
                        <PreviousOrdersTable
                            patientId={patientId}
                            services={services}
                            previousOrders={previousOrders}
                            onSaveOrder={handleSaveOrder}
                            orderLabel={getOrderLabel()}
                        />

                        {/* Optional: Display postnatal visits if available */}
                        {postnatalVisits && postnatalVisits.length > 0 && (
                            <div className="mt-8">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Postnatal Visit History
                                </h3>
                                <div className="overflow-hidden rounded-lg border">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Visit Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Baby Weight
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Immunization
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Breastfeeding Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {postnatalVisits.map(
                                                (visit: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.visit_date}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.baby_weight}{' '}
                                                            kg
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.immunization_given ||
                                                                'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                            {visit.breastfeeding_status ||
                                                                'N/A'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="child_health" className="mt-6">
                        <PreviousOrdersTable
                            patientId={patientId}
                            services={services}
                            previousOrders={previousOrders}
                            onSaveOrder={handleSaveOrder}
                            orderLabel={getOrderLabel()}
                        />

                        {/* Optional: Display child health records if available */}
                        {childHealthRecords &&
                            childHealthRecords.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="mb-4 text-lg font-semibold">
                                        Child Health Records
                                    </h3>
                                    <div className="overflow-hidden rounded-lg border">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                        Child Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                        Date of Birth
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                        Gender
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                        Birth Weight
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {childHealthRecords.map(
                                                    (
                                                        record: any,
                                                        index: number,
                                                    ) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                                {
                                                                    record.child_name
                                                                }
                                                            </td>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                                {
                                                                    record.child_dob
                                                                }
                                                            </td>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                                {record.gender}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                                {
                                                                    record.birth_weight
                                                                }{' '}
                                                                kg
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                    </TabsContent>
                </Tabs>
            </div>
        </PatientLayout>
    );
}

// components/payments/PaymentsPage.tsx

import { useState, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import {
    PaymentsHeader,
    PaymentsTabs,
    InvoicesTable,
    PaymentHistoryTable,
    PaymentMethodCard,
    PaymentModal,
    InvoiceDetailsModal,
    AddPaymentMethodModal,
    EditPaymentMethodModal,
    LoadingState,
} from './';

// ============================================================================
// Types
// ============================================================================

interface InvoiceItem {
    drug_id?: number | null;
    name: string;
    description?: string | null;
    quantity: number;
    price: number;
    total: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    status:
        | 'paid'
        | 'unpaid'
        | 'draft'
        | 'cancelled'
        | 'partial'
        | 'overdue'
        | 'sent';
    payment_scheme: string;
    issue_date: string;
    due_date: string;
    items: InvoiceItem[];
    total: number;
    paid_amount: number;
    due_amount: number;
    subtotal: number;
    tax: number;
    discount: number;
    currency: string;
    patient_id: number;
    prescription_id: number | null;
    visit_token: string | null;
    admission_number: string | null;
    sent_at: string | null;
    paid_date: string | null;
    notes: string | null;
    terms: string | null;
    created_at: string;
    updated_at: string;
}

interface Payment {
    id: number;
    patient_id: number;
    patient_name: string;
    invoice_id: number | null;
    invoice_number: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number: string;
    description: string | null;
    service_type: string;
    status: string;
    items?: any[];
}

interface PaymentMethod {
    id: number;
    type: string;
    name: string;
    last_four?: string;
    expiry_date?: string;
    is_default: boolean;
    provider?: string;
}

interface InsuranceProvider {
    id: number;
    name: string;
    code: string;
}

interface Patient {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
}

interface PaymentsPageProps {
    invoices: Invoice[];
    payments: Payment[];
    paymentMethods: PaymentMethod[];
    insuranceProviders: InsuranceProvider[];
    patient: Patient;
    auth?: any;
    errors?: any;
}

// ============================================================================
// Main Component
// ============================================================================

export default function PaymentsPage() {
    const { invoices, payments, paymentMethods, insuranceProviders, patient } =
        usePage<PaymentsPageProps>().props;

    const pathname = window.location.pathname;
    const patientId = useMemo(() => pathname.split('/')[3], [pathname]);

    const [activeTab, setActiveTab] = useState('Invoices');
    const [loading, setLoading] = useState(false);

    // Modal states
    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        invoice: Invoice | null;
    }>({
        open: false,
        invoice: null,
    });
    const [invoiceModal, setInvoiceModal] = useState<{
        open: boolean;
        invoice: Invoice | null;
    }>({
        open: false,
        invoice: null,
    });
    const [addMethodModal, setAddMethodModal] = useState(false);
    const [editMethodModal, setEditMethodModal] = useState<{
        open: boolean;
        method: PaymentMethod | null;
    }>({
        open: false,
        method: null,
    });

    // Calculate invoice counts
    const pendingInvoices = invoices.filter(
        (i) =>
            i.status === 'pending' ||
            i.status === 'overdue' ||
            i.status === 'unpaid',
    );

    // Handle refresh - reload the page
    const handleRefresh = () => {
        window.location.reload();
    };

    // Handle payment success
    const handlePaymentSuccess = () => {
        handleRefresh();
    };

    // Helper to get patient name
    const patientName =
        patient?.name ||
        `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() ||
        'Patient';

    // Show loading state while fetching data
    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="px-4 py-2">
            <PaymentsHeader
                patientId={patientId}
                patientName={patientName}
                activeTab={activeTab}
                onRefresh={handleRefresh}
                onAddMethod={() => setAddMethodModal(true)}
            />

            <PaymentsTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                invoiceCount={pendingInvoices.length}
                methodCount={paymentMethods.length}
            />

            {activeTab === 'Invoices' && (
                <InvoicesTable
                    invoices={invoices}
                    onPay={(inv) =>
                        setPaymentModal({ open: true, invoice: inv })
                    }
                    onView={(inv) =>
                        setInvoiceModal({ open: true, invoice: inv })
                    }
                />
            )}

            {activeTab === 'Payment History' && (
                <PaymentHistoryTable
                    payments={payments}
                    onView={(p) =>
                        alert(
                            `Payment: ${p.reference_number}\nAmount: ZMW ${p.amount}\nMethod: ${p.payment_method}`,
                        )
                    }
                />
            )}

            {activeTab === 'Payment Methods' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {paymentMethods.length === 0 ? (
                        <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
                            <p className="text-sm text-gray-500">
                                No payment methods
                            </p>
                            <Button
                                onClick={() => setAddMethodModal(true)}
                                className="mt-2 text-sm"
                            >
                                Add Payment Method
                            </Button>
                        </div>
                    ) : (
                        paymentMethods.map((method) => (
                            <PaymentMethodCard
                                key={method.id}
                                method={method}
                                onSetDefault={async (id) => {
                                    await axios.put(
                                        `/api/payment-methods/${id}/set-default`,
                                    );
                                    handleRefresh();
                                }}
                                onDelete={async (id) => {
                                    if (
                                        confirm('Delete this payment method?')
                                    ) {
                                        await axios.delete(
                                            `/api/payment-methods/${id}`,
                                        );
                                        handleRefresh();
                                    }
                                }}
                                onEdit={(m) =>
                                    setEditMethodModal({
                                        open: true,
                                        method: m,
                                    })
                                }
                            />
                        ))
                    )}
                </div>
            )}

            {/* Modals */}
            <PaymentModal
                isOpen={paymentModal.open}
                onClose={() => setPaymentModal({ open: false, invoice: null })}
                onSuccess={handlePaymentSuccess}
                invoice={paymentModal.invoice}
                patient={patient}
            />

            <InvoiceDetailsModal
                isOpen={invoiceModal.open}
                onClose={() => setInvoiceModal({ open: false, invoice: null })}
                invoice={invoiceModal.invoice}
            />

            <AddPaymentMethodModal
                isOpen={addMethodModal}
                onClose={() => setAddMethodModal(false)}
                onSuccess={handlePaymentSuccess}
                patientId={patientId}
                insuranceProviders={insuranceProviders}
            />

            <EditPaymentMethodModal
                isOpen={editMethodModal.open}
                onClose={() =>
                    setEditMethodModal({ open: false, method: null })
                }
                onSuccess={handlePaymentSuccess}
                paymentMethod={editMethodModal.method}
            />
        </div>
    );
}

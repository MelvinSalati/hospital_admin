// pages/patients/Payments.tsx

import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    X,
    CheckCircle,
    ArrowRight,
    FileText,
    Calendar,
    CreditCard,
    DollarSign,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import PatientLayout from '@/layouts/patients/PatientLayout';
import {
    PaymentsHeader,
    PaymentsTabs,
    InvoicesTable,
    PaymentHistoryTable,
    PaymentMethodCard,
    PaymentModal,
    AddPaymentMethodModal,
    EditPaymentMethodModal,
    LoadingState,
} from './components/payments';
import StatusBadge from './components/payments/StatusBadge';
import PageHeader from '@/components/PageHeader';

// ============================================================================
// Types
// ============================================================================

interface InvoiceItem {
    drug_id?: number | null;
    name: string;
    service_name: string;
    service_category: string;
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
    service_category: string;
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
    [key: string]: any;
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
// Helpers
// ============================================================================

const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return 'ZMW 0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

// ============================================================================
// InvoiceDetailsModal (inlined)
// ============================================================================

const InvoiceDetailsModal = ({
    isOpen,
    onClose,
    invoice,
    onProceedToPay,
}: {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onProceedToPay?: (invoice: Invoice) => void;
}) => {
    if (!isOpen || !invoice) return null;

    const items = invoice.items || [];
    const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled';

    return (
        <div className="fixed inset-0 z-50 flex w-full items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                {/* Header — non-scrollable */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight text-slate-900">
                                Invoice Details
                            </h2>
                            <p className="mt-0.5 font-mono text-xs text-slate-500">
                                #{invoice.invoice_number}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40">
                    <div className="space-y-5 px-5 py-5">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                                Status
                            </span>
                            <StatusBadge status={invoice.status} />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                    <Calendar className="h-3 w-3" />
                                    Invoice Date
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {formatDate(
                                        invoice.issue_date ||
                                            invoice.created_at,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                    <Calendar className="h-3 w-3" />
                                    Due Date
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {formatDate(invoice.due_date)}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800">
                                    Items
                                </h3>
                                <span className="text-xs text-slate-400">
                                    {items.length} item
                                    {items.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Item
                                            </th>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Department
                                            </th>
                                            <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Qty
                                            </th>
                                            <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Unit
                                            </th>
                                            <th className="px-3 py-2 text-right text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr
                                                key={idx}
                                                className="transition-colors hover:bg-blue-50/30"
                                            >
                                                <td className="px-3 py-2.5 text-sm text-slate-800">
                                                    {item.description ??
                                                        item.service_name ??
                                                        item.name ??
                                                        'Unknown item'}
                                                </td>
                                                <td className="px-3 py-2.5 text-sm text-slate-800">
                                                    {item.service_category ||
                                                        'Pharmacy'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-sm text-slate-600 tabular-nums">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-sm text-slate-600 tabular-nums">
                                                    {formatCurrency(item.price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-800 tabular-nums">
                                                    {formatCurrency(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-3 py-8 text-center text-sm text-slate-400"
                                                >
                                                    No items
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50">
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-2 text-right text-sm font-medium text-slate-600"
                                            >
                                                Total
                                            </td>
                                            <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                                                {formatCurrency(invoice.total)}
                                            </td>
                                        </tr>
                                        {invoice.paid_amount > 0 && (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-3 py-1 text-right text-xs text-slate-500"
                                                >
                                                    Paid
                                                </td>
                                                <td className="px-3 py-1 text-right text-xs text-emerald-600 tabular-nums">
                                                    -
                                                    {formatCurrency(
                                                        invoice.paid_amount,
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                        {invoice.due_amount > 0 && (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-3 py-1 text-right text-xs font-semibold text-slate-600"
                                                >
                                                    Balance Due
                                                </td>
                                                <td className="px-3 py-1 text-right text-sm font-bold text-amber-600 tabular-nums">
                                                    {formatCurrency(
                                                        invoice.due_amount,
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Paid status */}
                        {invoice.paid_date && (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm text-emerald-800">
                                    Paid on {formatDate(invoice.paid_date)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer — non-scrollable */}
                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    >
                        Close
                    </Button>
                    {canPay && onProceedToPay && (
                        <Button
                            onClick={() => onProceedToPay(invoice)}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                            Proceed to Pay
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Page
// ============================================================================

export default function Payments() {
    const { invoices, payments, paymentMethods, insuranceProviders, patient } =
        usePage<PaymentsPageProps>().props;
    console.log('Patients --', invoices);
    // Prefer patient id from Inertia props; fall back to the URL.
    const patientId = useMemo(() => {
        if (patient?.id) return String(patient.id);
        const pathname =
            typeof window !== 'undefined' ? window.location.pathname : '';
        return pathname.split('/')[3] || '';
    }, [patient?.id]);

    const [activeTab, setActiveTab] = useState('Invoices');
    const [loading, setLoading] = useState(false);

    // Modal states
    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        invoice: Invoice | null;
    }>({ open: false, invoice: null });

    const [invoiceModal, setInvoiceModal] = useState<{
        open: boolean;
        invoice: Invoice | null;
    }>({ open: false, invoice: null });

    const [addMethodModal, setAddMethodModal] = useState(false);
    const [editMethodModal, setEditMethodModal] = useState<{
        open: boolean;
        method: PaymentMethod | null;
    }>({ open: false, method: null });

    // Anything that still owes money
    const pendingInvoices = useMemo(
        () =>
            (invoices || []).filter((i) =>
                ['pending', 'overdue', 'unpaid', 'partial'].includes(i.status),
            ),
        [invoices],
    );

    const handleRefresh = () => {
        window.location.reload();
    };

    const handlePaymentSuccess = () => {
        handleRefresh();
    };

    const patientName =
        patient?.name ||
        `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() ||
        'Patient';

    // Open the payment modal from the invoice details footer
    const handleProceedToPay = (inv: Invoice) => {
        setInvoiceModal({ open: false, invoice: null });
        setPaymentModal({ open: true, invoice: inv });
    };

    if (loading) {
        return (
            <PatientLayout
                patient={patient} // ← ADDED
                breadcrumbs={[
                    { title: 'Patient', href: '/' },
                    { title: 'Payments', href: '/' },
                ]}
            >
                <LoadingState />
            </PatientLayout>
        );
    }

    return (
        <PatientLayout
            patient={patient} // ← ADDED (this is the fix)
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Payments', href: '/' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-6">
                <PageHeader
                    icon={<DollarSign />}
                    title={'Payments'}
                    subtitle={'Manage Payments'}
                />
                <InvoicesTable
                    invoices={invoices}
                    onPay={(inv) =>
                        setPaymentModal({ open: true, invoice: inv })
                    }
                    onView={(inv) =>
                        setInvoiceModal({ open: true, invoice: inv })
                    }
                />
                {/* Modals */}
                <PaymentModal
                    isOpen={paymentModal.open}
                    onClose={() =>
                        setPaymentModal({ open: false, invoice: null })
                    }
                    onSuccess={handlePaymentSuccess}
                    invoice={paymentModal.invoice}
                    patient={patient}
                />

                <InvoiceDetailsModal
                    isOpen={invoiceModal.open}
                    onClose={() =>
                        setInvoiceModal({ open: false, invoice: null })
                    }
                    invoice={invoiceModal.invoice}
                    onProceedToPay={handleProceedToPay}
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
        </PatientLayout>
    );
}

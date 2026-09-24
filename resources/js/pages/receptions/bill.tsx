// resources/js/pages/reception/Bill.tsx
import { usePage } from '@inertiajs/react';
import {
    DollarSign,
    FileText,
    User,
    Clock,
    Eye,
    CreditCard,
    CheckCircle,
    XCircle,
    AlertCircle,
    Printer,
    Phone,
    X,
    Calendar,
    MapPin,
    Mail,
    Stethoscope,
    Receipt,
    Package,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============ TYPES ============
interface InvoiceItem {
    id?: number;
    service_id: number;
    service_name: string;
    service_category: string;
    type: string;
    priority: string;
    quantity: number;
    price: number;
    total: number;
    created_at?: string;
}

interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    patient_number: string;
    gender: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    nationality: string | null;
    occupation: string | null;
    marital_status: string | null;
    status: string;
}

interface Bill {
    id: number;
    invoice_number: string;
    patient_id: number;
    patient_name: string | null;
    patient_phone: string | null;
    patient_email: string | null;
    amount: number;
    tax: number;
    discount: number;
    total_amount: number;
    total: number;
    paid_amount: number;
    balance: number;
    due_amount: number;
    subtotal: number;
    status: 'raised' | 'pending' | 'paid' | 'cancelled' | 'unpaid';
    payment_method: string | null;
    payment_scheme: string | null;
    payment_date: string | null;
    due_date: string | null;
    issue_date: string | null;
    description: string;
    items: InvoiceItem[];
    patient: Patient;
    visit_token: string | null;
    admission_number: string | null;
    prescription_id: number | null;
    created_by: number | null;
    creator_name: string | null;
    created_at: string | null;
    updated_at: string | null;
    currency: string;
    notes: string | null;
    terms: string | null;
}

// ============ HELPERS ============
const formatCurrency = (amount: number, currency = 'ZMW'): string =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

const formatDateTime = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'N/A';
    }
};

const calculateAge = (dob: string | null): string => {
    if (!dob) return 'N/A';
    try {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }
        return `${age} yrs`;
    } catch {
        return 'N/A';
    }
};

// ============ STATUS ============
type StatusKey = 'raised' | 'pending' | 'unpaid' | 'paid' | 'cancelled';

const STATUS_MAP: Record<
    StatusKey,
    { label: string; badge: string; dot: string; icon: JSX.Element }
> = {
    raised: {
        label: 'Raised',
        badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        dot: 'bg-blue-500',
        icon: <FileText size={12} />,
    },
    pending: {
        label: 'Pending',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        icon: <Clock size={12} />,
    },
    unpaid: {
        label: 'Unpaid',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        icon: <Clock size={12} />,
    },
    paid: {
        label: 'Paid',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        icon: <CheckCircle size={12} />,
    },
    cancelled: {
        label: 'Cancelled',
        badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dot: 'bg-slate-400',
        icon: <XCircle size={12} />,
    },
};

const getStatusConfig = (status: string) =>
    STATUS_MAP[status as StatusKey] ?? STATUS_MAP.raised;

// ============ INVOICE MODAL ============
interface InvoiceModalProps {
    bill: Bill | null;
    isOpen: boolean;
    onClose: () => void;
    onPrint: (bill: Bill) => void;
    onRecordPayment: (id: number) => void;
}

function InvoiceModal({
    bill,
    isOpen,
    onClose,
    onPrint,
    onRecordPayment,
}: InvoiceModalProps) {
    if (!isOpen || !bill) return null;

    const patient = bill.patient;
    const statusConfig = getStatusConfig(bill.status);
    const isOverdue =
        bill.status !== 'paid' &&
        bill.status !== 'cancelled' &&
        bill.due_date &&
        new Date(bill.due_date) < new Date();

    const balanceDue = parseFloat(String(bill.due_amount || bill.balance || 0));
    const canPay =
        (bill.status === 'raised' ||
            bill.status === 'pending' ||
            bill.status === 'unpaid') &&
        balanceDue > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md border border-slate-200 bg-blue-600 p-2">
                            <DollarSign size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Invoice Details
                            </h2>
                            <p className="font-mono text-xs text-slate-500">
                                {bill.invoice_number}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ─── Status strip ─── */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${statusConfig.badge}`}
                    >
                        {statusConfig.icon}
                        {statusConfig.label}
                    </span>
                    {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            <AlertCircle size={11} />
                            Overdue
                        </span>
                    )}
                </div>

                {/* ─── Body ─── */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Patient + Invoice Info */}
                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {/* Patient */}
                        <div className="rounded-md border border-slate-200 bg-white p-3">
                            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <User size={12} />
                                Patient
                            </h3>
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                                    {patient?.first_name?.[0]}
                                    {patient?.last_name?.[0]}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                        {patient?.first_name}{' '}
                                        {patient?.last_name}
                                    </p>
                                    <p className="font-mono text-[11px] text-slate-500">
                                        {patient?.patient_number}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px]">
                                <InfoRow
                                    icon={<User size={11} />}
                                    value={patient?.gender || 'N/A'}
                                    capitalize
                                />
                                <InfoRow
                                    icon={<Calendar size={11} />}
                                    value={calculateAge(patient?.date_of_birth)}
                                />
                                <InfoRow
                                    icon={<Stethoscope size={11} />}
                                    value={`Blood: ${patient?.blood_group || 'N/A'}`}
                                />
                                <InfoRow
                                    icon={<MapPin size={11} />}
                                    value={patient?.nationality || 'N/A'}
                                />
                                {patient?.phone && (
                                    <InfoRow
                                        icon={<Phone size={11} />}
                                        value={patient.phone}
                                    />
                                )}
                                {patient?.email && (
                                    <InfoRow
                                        icon={<Mail size={11} />}
                                        value={patient.email}
                                        truncate
                                    />
                                )}
                            </div>
                        </div>

                        {/* Invoice Info */}
                        <div className="rounded-md border border-slate-200 bg-white p-3">
                            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <FileText size={12} />
                                Invoice
                            </h3>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                                <Field
                                    label="Issue Date"
                                    value={formatDate(bill.issue_date)}
                                />
                                <Field
                                    label="Due Date"
                                    value={formatDate(bill.due_date)}
                                />
                                <Field
                                    label="Scheme"
                                    value={bill.payment_scheme || 'N/A'}
                                    capitalize
                                />
                                <Field
                                    label="Visit Token"
                                    value={bill.visit_token || 'N/A'}
                                    mono
                                />
                                <Field
                                    label="Currency"
                                    value={bill.currency || 'ZMW'}
                                />
                                <Field
                                    label="Created"
                                    value={formatDateTime(bill.created_at)}
                                />
                            </dl>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            <Package size={12} />
                            Items ({bill.items?.length || 0})
                        </h3>
                        <div className="overflow-hidden rounded-md border border-slate-200">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                                        <th className="px-3 py-2">#</th>
                                        <th className="px-3 py-2">Service</th>
                                        <th className="hidden px-3 py-2 sm:table-cell">
                                            Category
                                        </th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2 text-center">
                                            Qty
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Price
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bill.items?.length ? (
                                        bill.items.map((item, idx) => (
                                            <tr
                                                key={item.id || idx}
                                                className="hover:bg-slate-50/60"
                                            >
                                                <td className="px-3 py-2 text-slate-400">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-3 py-2 font-medium text-slate-800">
                                                    {item.service_name}
                                                </td>
                                                <td className="hidden px-3 py-2 text-slate-600 sm:table-cell">
                                                    {item.service_category}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-slate-700">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                                                    {formatCurrency(
                                                        item.price,
                                                        bill.currency,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">
                                                    {formatCurrency(
                                                        item.total,
                                                        bill.currency,
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-6 text-center text-xs text-slate-400"
                                            >
                                                No items on this invoice
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes / Terms + Summary */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {/* Left — Notes & Terms */}
                        <div className="space-y-2">
                            {bill.notes && (
                                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-amber-700 uppercase">
                                        Notes
                                    </p>
                                    <p className="text-xs text-amber-900">
                                        {bill.notes}
                                    </p>
                                </div>
                            )}
                            {bill.terms && (
                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                                        Terms
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        {bill.terms}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right — Summary */}
                        <div className="rounded-md border border-slate-200 bg-white p-3">
                            <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                                Payment Summary
                            </p>
                            <div className="space-y-1.5 text-xs">
                                <SummaryRow
                                    label="Subtotal"
                                    value={formatCurrency(
                                        parseFloat(String(bill.subtotal || 0)),
                                        bill.currency,
                                    )}
                                />
                                <SummaryRow
                                    label="Tax"
                                    value={formatCurrency(
                                        parseFloat(String(bill.tax || 0)),
                                        bill.currency,
                                    )}
                                />
                                {parseFloat(String(bill.discount || 0)) > 0 && (
                                    <SummaryRow
                                        label="Discount"
                                        value={`-${formatCurrency(
                                            parseFloat(
                                                String(bill.discount || 0),
                                            ),
                                            bill.currency,
                                        )}`}
                                        valueClass="text-emerald-600"
                                    />
                                )}
                                <div className="border-t border-slate-200 pt-1.5">
                                    <SummaryRow
                                        label="Total"
                                        value={formatCurrency(
                                            parseFloat(
                                                String(
                                                    bill.total_amount ||
                                                        bill.total ||
                                                        0,
                                                ),
                                            ),
                                            bill.currency,
                                        )}
                                        bold
                                    />
                                </div>
                                <SummaryRow
                                    label="Paid"
                                    value={formatCurrency(
                                        parseFloat(
                                            String(bill.paid_amount || 0),
                                        ),
                                        bill.currency,
                                    )}
                                    valueClass="text-emerald-600"
                                />
                                <div className="border-t-2 border-slate-200 pt-1.5">
                                    <SummaryRow
                                        label="Balance Due"
                                        value={formatCurrency(
                                            balanceDue,
                                            bill.currency,
                                        )}
                                        bold
                                        valueClass={
                                            balanceDue > 0
                                                ? 'text-red-600'
                                                : 'text-emerald-600'
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Footer ─── */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => onPrint(bill)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-100"
                    >
                        <Printer size={13} />
                        Print
                    </button>
                    {canPay && (
                        <button
                            onClick={() => {
                                const id = bill.id;
                                onClose();
                                setTimeout(() => onRecordPayment(id), 150);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                            <CreditCard size={13} />
                            Record Payment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Small subcomponents ───
function InfoRow({
    icon,
    value,
    capitalize,
    truncate,
}: {
    icon: React.ReactNode;
    value: string;
    capitalize?: boolean;
    truncate?: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-400">{icon}</span>
            <span
                className={`${capitalize ? 'capitalize' : ''} ${truncate ? 'truncate' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}

function Field({
    label,
    value,
    mono,
    capitalize,
}: {
    label: string;
    value: string;
    mono?: boolean;
    capitalize?: boolean;
}) {
    return (
        <div>
            <dt className="text-slate-400">{label}</dt>
            <dd
                className={`font-medium text-slate-700 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    bold,
    valueClass,
}: {
    label: string;
    value: string;
    bold?: boolean;
    valueClass?: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className={`text-slate-600 ${bold ? 'font-semibold' : ''}`}>
                {label}
            </span>
            <span
                className={`tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${valueClass ?? 'text-slate-800'}`}
            >
                {value}
            </span>
        </div>
    );
}

// ============ MAIN COMPONENT ============
export default function Bill() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({
        total_raised: 0,
        total_amount: 0,
        total_paid: 0,
        total_due: 0,
        overdue: 0,
        total_patients_with_bills: 0,
    });

    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    const pageProps = usePage().props as { bills?: Bill[] };
    const initialBills = pageProps.bills || [];

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await Http.get('/api/bills');
            setBills(res.data.bills || res.data);
            const summaryRes = await Http.get('/api/bills/summary');
            setSummary(summaryRes.data);
        } catch {
            Notiflix.Notify.failure('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialBills.length > 0) {
            setBills(initialBills);
        } else {
            fetchBills();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const viewBill = async (row: Bill) => {
        if (row.items?.length && row.patient) {
            setSelectedBill(row);
            setIsModalOpen(true);
            return;
        }

        setModalLoading(true);
        setIsModalOpen(true);
        try {
            const res = await Http.get(`/api/bills/${row.id}`);
            const bill = res.data.bill || res.data;
            setSelectedBill(bill);
        } catch {
            Notiflix.Notify.failure('Failed to load bill details');
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBill(null);
    };

    const recordPayment = async (id: number) => {
        Notiflix.Confirm.show(
            'Record Payment',
            'Enter payment amount and method',
            'Continue',
            'Cancel',
            async () => {
                const amount = window.prompt('Enter payment amount:');
                if (!amount || isNaN(parseFloat(amount))) {
                    Notiflix.Notify.warning('Please enter a valid amount');
                    return;
                }

                const method = window.prompt(
                    'Payment method (cash/card/insurance/online/other):',
                );
                if (!method) {
                    Notiflix.Notify.warning('Please enter a payment method');
                    return;
                }

                try {
                    await Http.post(`/api/bills/${id}/pay`, {
                        amount: parseFloat(amount),
                        payment_method: method.toLowerCase(),
                    });
                    Notiflix.Notify.success('Payment recorded successfully');
                    fetchBills();
                } catch (error: any) {
                    Notiflix.Notify.failure(
                        error.response?.data?.message ||
                            'Failed to record payment',
                    );
                }
            },
        );
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await Http.put(`/api/bills/${id}/status`, { status });
            Notiflix.Notify.success(`Bill ${status} successfully`);
            fetchBills();
        } catch {
            Notiflix.Notify.failure('Failed to update status');
        }
    };

    const printBill = (bill: Bill) => {
        Notiflix.Notify.info(
            `Preparing invoice #${bill.invoice_number} for print...`,
        );
        window.open(`/api/bills/${bill.id}/print`, '_blank');
    };

    // ─── Columns ───
    const columns: Column<Bill>[] = [
        {
            id: 'invoice_number',
            label: 'Invoice #',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <div className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-600">
                        <FileText size={13} />
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-800">
                        {value}
                    </span>
                </div>
            ),
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => {
                const patient = row.patient;
                const displayName =
                    value ||
                    (patient
                        ? `${patient.first_name} ${patient.last_name}`
                        : 'Unknown');
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                            <User size={13} />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-slate-800">
                                {displayName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span>
                                    {patient?.patient_number || row.patient_id}
                                </span>
                                {patient?.phone && (
                                    <>
                                        <span>•</span>
                                        <span>{patient.phone}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'issue_date',
            label: 'Issue Date',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-700">
                        {formatDate(value)}
                    </span>
                </div>
            ),
        },
        {
            id: 'due_date',
            label: 'Due Date',
            sortable: true,
            format: (value, row) => {
                if (!value)
                    return <span className="text-xs text-slate-400">—</span>;

                const isOverdue =
                    row.status !== 'paid' &&
                    row.status !== 'cancelled' &&
                    new Date(value) < new Date();

                return (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-700">
                            {formatDate(value)}
                        </span>
                        {isOverdue && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                                <AlertCircle size={10} />
                                Overdue
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'total_amount',
            label: 'Amount',
            sortable: true,
            format: (value, row) => {
                const total = parseFloat(
                    String(row.total_amount || row.total || value || 0),
                );
                const balance = parseFloat(
                    String(row.due_amount || row.balance || 0),
                );
                return (
                    <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-800 tabular-nums">
                            {formatCurrency(total, row.currency)}
                        </div>
                        {row.status !== 'paid' && balance > 0 && (
                            <div className="text-[11px] text-amber-600 tabular-nums">
                                Bal: {formatCurrency(balance, row.currency)}
                            </div>
                        )}
                        {row.status === 'paid' && (
                            <div className="text-[11px] text-emerald-600">
                                ✓ Paid
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                raised: 'info',
                pending: 'warning',
                unpaid: 'warning',
                paid: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusConfig(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${config.badge}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                        />
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // ─── Actions ───
    const actions: Action<Bill>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => viewBill(row),
        },
        {
            label: 'Pay',
            icon: <CreditCard size={16} />,
            color: 'success',
            show: (row) =>
                row.status === 'raised' ||
                row.status === 'pending' ||
                row.status === 'unpaid',
            onClick: (row) => recordPayment(row.id),
        },
        {
            label: 'Print',
            icon: <Printer size={16} />,
            color: 'primary',
            show: (row) => row.status !== 'cancelled',
            onClick: (row) => printBill(row),
        },
        {
            label: 'Mark Paid',
            icon: <CheckCircle size={16} />,
            color: 'success',
            show: (row) =>
                (row.status === 'raised' ||
                    row.status === 'pending' ||
                    row.status === 'unpaid') &&
                parseFloat(String(row.due_amount || row.balance || 0)) > 0,
            onClick: (row) => updateStatus(row.id, 'paid'),
        },
        {
            label: 'Cancel',
            icon: <XCircle size={16} />,
            color: 'error',
            show: (row) => row.status !== 'paid' && row.status !== 'cancelled',
            onClick: (row) => updateStatus(row.id, 'cancelled'),
        },
    ];

    const statusOptions = [
        { value: 'raised', label: 'Raised' },
        { value: 'pending', label: 'Pending' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'paid', label: 'Paid' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const displayData = bills.length > 0 ? bills : initialBills;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reception', href: '/reception/bills' },
                { title: 'Pending Invoices', href: '/reception/bills' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4">
                <PageHeader
                    icon={<DollarSign className="h-6 w-6" />}
                    title="Pending Invoices"
                    subtitle="Manage and view all billing information. Track outstanding invoices and payments."
                />

                <div className="mt-6">
                    <ReusableTable
                        title="Outstanding Invoices"
                        columns={columns}
                        data={displayData}
                        actions={actions}
                        loading={loading}
                        filterPlaceholder="Search by patient or invoice..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="created_at"
                        emptyMessage="No outstanding invoices found"
                        className="shadow-sm"
                    />
                </div>
            </div>

            <InvoiceModal
                key={selectedBill?.id ?? 'empty'}
                bill={selectedBill}
                isOpen={isModalOpen}
                onClose={closeModal}
                onPrint={printBill}
                onRecordPayment={recordPayment}
            />

            {modalLoading && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
                        <div className="flex items-center gap-2.5">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                            <span className="text-xs font-medium text-slate-700">
                                Loading invoice details…
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

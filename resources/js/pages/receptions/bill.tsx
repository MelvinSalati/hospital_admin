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
    TrendingUp,
    TrendingDown,
    Users,
    Phone,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

interface Bill {
    id: number;
    invoice_number: string;
    patient_id: number;
    patient_name: string;
    patient_phone: string | null;
    patient_email: string | null;
    amount: number;
    tax: number;
    discount: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: 'raised' | 'pending' | 'paid' | 'cancelled';
    payment_method: string | null;
    payment_date: string | null;
    due_date: string | null;
    issue_date: string | null;
    description: string;
    items: any[];
    created_by: number;
    creator_name: string;
    created_at: string | null;
    updated_at: string | null;
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

// Helper to format date
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

// Helper to get status config
const getStatusConfig = (status: string) => {
    const configs: Record<
        string,
        { label: string; gradient: string; icon: JSX.Element }
    > = {
        raised: {
            label: 'Raised',
            gradient: 'from-blue-400 to-blue-500',
            icon: <FileText size={14} />,
        },
        pending: {
            label: 'Pending',
            gradient: 'from-amber-400 to-amber-500',
            icon: <Clock size={14} />,
        },
        paid: {
            label: 'Paid',
            gradient: 'from-emerald-400 to-emerald-500',
            icon: <CheckCircle size={14} />,
        },
        cancelled: {
            label: 'Cancelled',
            gradient: 'from-gray-400 to-gray-500',
            icon: <XCircle size={14} />,
        },
    };
    return configs[status] || configs['raised'];
};

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

    // Get initial data from server props
    const pageProps = usePage().props as { bills?: Bill[] };
    const initialBills = pageProps.bills || [];

    // Load bills
    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await Http.get('/api/bills');
            setBills(res.data.bills || res.data);
            // Fetch summary
            const summaryRes = await Http.get('/api/bills/summary');
            setSummary(summaryRes.data);
        } catch {
            Notiflix.Notify.failure('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    // View bill details
    const viewBill = async (id: number) => {
        try {
            const res = await Http.get(`/api/bills/${id}`);
            const bill = res.data.bill;

            // Show detailed notification or open modal
            Notiflix.Report.info(
                'Invoice Details',
                `
                <div style="text-align: left; padding: 10px;">
                    <p><strong>Invoice #:</strong> ${bill.invoice_number}</p>
                    <p><strong>Patient:</strong> ${bill.patient_name}</p>
                    <p><strong>Total Amount:</strong> ${formatCurrency(bill.total_amount)}</p>
                    <p><strong>Paid Amount:</strong> ${formatCurrency(bill.paid_amount)}</p>
                    <p><strong>Balance:</strong> ${formatCurrency(bill.balance)}</p>
                    <p><strong>Status:</strong> ${bill.status.toUpperCase()}</p>
                    <p><strong>Due Date:</strong> ${formatDate(bill.due_date)}</p>
                    <p><strong>Created By:</strong> ${bill.creator_name}</p>
                    ${bill.description ? `<p><strong>Description:</strong> ${bill.description}</p>` : ''}
                </div>
                `,
                'Close',
            );
        } catch {
            Notiflix.Notify.failure('Failed to load bill details');
        }
    };

    // Record payment
    const recordPayment = async (id: number) => {
        Notiflix.Confirm.show(
            'Record Payment',
            'Enter payment details',
            async () => {
                // Show custom input modal - in production, use a proper modal
                const amount = prompt('Enter payment amount:');
                if (!amount || isNaN(parseFloat(amount))) {
                    Notiflix.Notify.warning('Please enter a valid amount');
                    return;
                }

                const method = prompt(
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
            'Confirm Payment',
            'Cancel',
        );
    };

    // Update bill status
    const updateStatus = async (id: number, status: string) => {
        try {
            await Http.put(`/api/bills/${id}/status`, { status });
            Notiflix.Notify.success(`Bill ${status} successfully`);
            fetchBills();
        } catch {
            Notiflix.Notify.failure('Failed to update status');
        }
    };

    // Print bill
    const printBill = (bill: Bill) => {
        Notiflix.Notify.info(
            `Preparing invoice #${bill.invoice_number} for print...`,
        );
        // In production, open print view
        window.open(`/api/bills/${bill.id}/print`, '_blank');
    };

    // Define columns
    const columns: Column<Bill>[] = [
        {
            id: 'invoice_number',
            label: 'Invoice #',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
                        <FileText size={14} />
                    </div>
                    <span className="font-mono text-sm font-semibold text-indigo-600">
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
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                        <User size={14} />
                    </div>
                    <div>
                        <span className="font-medium text-slate-800">
                            {value}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>ID: {row.patient_id}</span>
                            {row.patient_phone && (
                                <>
                                    <span>•</span>
                                    <Phone size={10} />
                                    <span>{row.patient_phone}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'issue_date',
            label: 'Issue Date',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-700">
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
                    return <span className="text-sm text-slate-400">N/A</span>;

                const isOverdue =
                    row.status !== 'paid' &&
                    row.status !== 'cancelled' &&
                    new Date(value) < new Date();

                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700">
                            {formatDate(value)}
                        </span>
                        {isOverdue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <AlertCircle size={12} />
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
            format: (value, row) => (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-800">
                        {formatCurrency(value)}
                    </div>
                    {row.status !== 'paid' && row.balance > 0 && (
                        <div className="text-xs text-amber-600">
                            Balance: {formatCurrency(row.balance)}
                        </div>
                    )}
                    {row.status === 'paid' && (
                        <div className="text-xs text-emerald-600">
                            ✓ Paid in full
                        </div>
                    )}
                </div>
            ),
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
                paid: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusConfig(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-medium text-white shadow-sm`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // Define actions
    const actions: Action<Bill>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => viewBill(row.id),
        },
        {
            label: 'Pay',
            icon: <CreditCard size={16} />,
            color: 'success',
            show: (row) => row.status === 'raised' || row.status === 'pending',
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
                (row.status === 'raised' || row.status === 'pending') &&
                row.balance > 0,
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

    // Status options for filter dropdown
    const statusOptions = [
        { value: 'raised', label: 'Raised' },
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    // Use either fetched or initial data
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

                {/* Reusable Table */}
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
        </AppLayout>
    );
}

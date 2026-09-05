// resources/js/pages/receptions/Payment.tsx
import { usePage, router } from '@inertiajs/react';
import {
    DollarSign,
    Eye,
    Printer,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    User,
    Phone,
    CreditCard,
    Calendar,
    Building2,
    FileText,
    Receipt,
} from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Payment {
    id: number;
    invoice_number: string;
    patient_id: number;
    patient: {
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        patient_number: string;
    };
    amount: number;
    payment_method: 'cash' | 'card' | 'mobile_money' | 'bank' | 'insurance';
    status: 'paid' | 'unpaid' | 'partial' | 'draft' | 'cancelled';
    payment_date: string;
    paid_amount: string;
    subtotal: string;
    total: string;
    balance: number;
    items: any[];
    created_at: string;
    updated_at: string;
}

interface PaymentsProps {
    payments: Payment[];
}

// ============================================
// HELPERS
// ============================================

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
    }).format(amount);
};

const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

const getPatientName = (patient: any): string => {
    if (!patient) return 'Unknown';
    return (
        `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
        'Unknown'
    );
};

const getPaymentMethodConfig = (method: string) => {
    const configs: Record<
        string,
        { label: string; color: string; icon: React.ReactNode }
    > = {
        cash: {
            label: 'Cash',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <DollarSign className="h-3.5 w-3.5" />,
        },
        card: {
            label: 'Card',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            icon: <CreditCard className="h-3.5 w-3.5" />,
        },
        mobile_money: {
            label: 'Mobile Money',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            icon: <Phone className="h-3.5 w-3.5" />,
        },
        bank: {
            label: 'Bank',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Building2 className="h-3.5 w-3.5" />,
        },
        insurance: {
            label: 'Insurance',
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            icon: <FileText className="h-3.5 w-3.5" />,
        },
    };
    return configs[method] || configs.cash;
};

const getStatusConfig = (status: string) => {
    const configs: Record<
        string,
        { label: string; color: string; icon: React.ReactNode }
    > = {
        paid: {
            label: 'Paid',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <CheckCircle className="h-3.5 w-3.5" />,
        },
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <AlertCircle className="h-3.5 w-3.5" />,
        },
        partial: {
            label: 'Partial',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Clock className="h-3.5 w-3.5" />,
        },
        draft: {
            label: 'Draft',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <FileText className="h-3.5 w-3.5" />,
        },
        cancelled: {
            label: 'Cancelled',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <XCircle className="h-3.5 w-3.5" />,
        },
    };
    return configs[status] || configs.draft;
};

// ============================================
// MAIN PAYMENT COMPONENT
// ============================================

export default function Payment() {
    const { payments } = usePage<PaymentsProps>().props;
    const [loading, setLoading] = useState(false);

    console.log('Payments data:', payments);

    // Action handlers
    const handleViewPayment = async (paymentId: number) => {
        try {
            Notiflix.Report.info(
                'Payment Details',
                `Viewing payment record #${paymentId}`,
                'Close',
            );
        } catch {
            Notiflix.Notify.failure('Failed to load payment details');
        }
    };

    const handlePrintReceipt = (payment: Payment) => {
        Notiflix.Notify.info(
            `Printing receipt for ${payment.invoice_number}...`,
        );
        window.open(`/api/payments/${payment.id}/print`, '_blank');
    };

    // Define columns
    const columns: Column<Payment>[] = [
        {
            id: 'invoice_number',
            label: 'Invoice #',
            sortable: true,
            format: (value) => (
                <div className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </div>
            ),
        },
        {
            id: 'patient',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-sm">
                        <User size={14} />
                    </div>
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {getPatientName(row.patient)}
                        </span>
                        {row.patient?.phone && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Phone size={10} />
                                <span>{row.patient.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'total',
            label: 'Amount',
            sortable: true,
            format: (value) => (
                <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(parseFloat(value) || 0)}
                </span>
            ),
        },
        {
            id: 'payment_method',
            label: 'Method',
            sortable: true,
            filterable: true,
            format: (value) => {
                const config = getPaymentMethodConfig(value);
                return (
                    <Badge
                        className={cn(
                            'flex items-center gap-1.5 text-xs',
                            config.color,
                        )}
                    >
                        {config.icon}
                        {config.label}
                    </Badge>
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
                paid: 'success',
                unpaid: 'error',
                partial: 'warning',
                draft: 'secondary',
                cancelled: 'secondary',
            },
            format: (value) => {
                const config = getStatusConfig(value);
                return (
                    <Badge
                        className={cn(
                            'flex items-center gap-1.5 text-xs',
                            config.color,
                        )}
                    >
                        {config.icon}
                        {config.label}
                    </Badge>
                );
            },
        },
        {
            id: 'created_at',
            label: 'Date',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(value)}
                    </span>
                </div>
            ),
        },
    ];

    // Define actions
    const actions: Action<Payment>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => handleViewPayment(row.id),
        },
        {
            label: 'Print',
            icon: <Printer size={16} />,
            color: 'primary',
            show: (row) => row.status === 'paid',
            onClick: (row) => handlePrintReceipt(row),
        },
    ];

    // Status options for filter dropdown
    const statusOptions = [
        { value: 'paid', label: 'Paid' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partial', label: 'Partial' },
        { value: 'draft', label: 'Draft' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    // Calculate summary stats
    const totalPayments = payments?.length || 0;
    const totalAmount =
        payments?.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0) || 0;
    const paidCount = payments?.filter((p) => p.status === 'paid').length || 0;
    const unpaidCount =
        payments?.filter((p) => p.status === 'unpaid').length || 0;
    const partialCount =
        payments?.filter((p) => p.status === 'partial').length || 0;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reception', href: '/reception' },
                { title: 'Payments', href: '/reception/payments' },
            ]}
        >
            <div className="bg-blue-50 h-full p-4">
                <PageHeader
                    icon={<DollarSign className="h-6 w-6" />}
                    title="Payments"
                    subtitle="View and manage all patient payments"
                />

                {/* Payments Table */}
                <div className="mt-6">
                    <ReusableTable
                        title="Payment Records"
                        columns={columns}
                        data={payments || []}
                        actions={actions}
                        loading={loading}
                        filterPlaceholder="Search by invoice or patient..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="created_at"
                        emptyMessage="No payments found"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}

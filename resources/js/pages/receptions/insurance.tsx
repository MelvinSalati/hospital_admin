// resources/js/pages/receptions/Insurance.tsx
import { usePage, router } from '@inertiajs/react';
import {
    Shield,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    User,
    Phone,
    FileText,
    Calendar,
    DollarSign,
    Building2,
    Printer,
    Download,
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

interface InsuranceInvoice {
    id: number;
    invoice_number: string;
    patient_id: number;
    patient: {
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        patient_number: string;
        email?: string;
    };
    payment_scheme: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    paid_amount: string;
    balance: string;
    status: 'paid' | 'unpaid' | 'partial' | 'draft' | 'cancelled';
    issue_date: string;
    due_date: string;
    paid_date: string;
    items: any[];
    created_at: string;
    updated_at: string;
}

interface InsuranceProps {
    insurance: InsuranceInvoice[];
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

const getSchemeConfig = (scheme: string) => {
    const configs: Record<
        string,
        { label: string; color: string; icon: React.ReactNode }
    > = {
        insurance: {
            label: 'Insurance',
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            icon: <Shield className="h-3.5 w-3.5" />,
        },
        national_insurance: {
            label: 'National Insurance',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            icon: <Building2 className="h-3.5 w-3.5" />,
        },
        private_insurance: {
            label: 'Private Insurance',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            icon: <Shield className="h-3.5 w-3.5" />,
        },
    };
    return (
        configs[scheme] || {
            label:
                scheme?.charAt(0).toUpperCase() + scheme?.slice(1) ||
                'Insurance',
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            icon: <Shield className="h-3.5 w-3.5" />,
        }
    );
};

// ============================================
// MAIN INSURANCE COMPONENT
// ============================================

export default function Insurance() {
    const { insurance } = usePage<InsuranceProps>().props;
    const [loading, setLoading] = useState(false);

    console.log('Insurance data:', insurance);

    // Action handlers
    const handleViewInvoice = async (invoiceId: number) => {
        try {
            Notiflix.Report.info(
                'Invoice Details',
                `Viewing insurance invoice #${invoiceId}`,
                'Close',
            );
        } catch {
            Notiflix.Notify.failure('Failed to load invoice details');
        }
    };

    const handlePrintInvoice = (invoice: InsuranceInvoice) => {
        Notiflix.Notify.info(`Printing invoice ${invoice.invoice_number}...`);
        window.open(`/api/invoices/${invoice.id}/print`, '_blank');
    };

    // Define columns
    const columns: Column<InsuranceInvoice>[] = [
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 text-white shadow-sm">
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
            id: 'payment_scheme',
            label: 'Scheme',
            sortable: true,
            filterable: true,
            format: (value) => {
                const config = getSchemeConfig(value);
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
            id: 'balance',
            label: 'Balance',
            sortable: true,
            format: (value) => {
                const balance = parseFloat(value) || 0;
                return (
                    <span
                        className={cn(
                            'font-bold',
                            balance > 0 ? 'text-red-600' : 'text-emerald-600',
                        )}
                    >
                        {formatCurrency(balance)}
                    </span>
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
    const actions: Action<InsuranceInvoice>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => handleViewInvoice(row.id),
        },
        {
            label: 'Print',
            icon: <Printer size={16} />,
            color: 'primary',
            show: (row) => row.status === 'paid',
            onClick: (row) => handlePrintInvoice(row),
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

    // Payment scheme options for filter
    const schemeOptions = [
        { value: 'insurance', label: 'Insurance' },
        { value: 'national_insurance', label: 'National Insurance' },
        { value: 'private_insurance', label: 'Private Insurance' },
    ];

    // Calculate summary stats
    const totalInvoices = insurance?.length || 0;
    const totalAmount =
        insurance?.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0) || 0;
    const totalBalance =
        insurance?.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0) ||
        0;
    const paidCount = insurance?.filter((p) => p.status === 'paid').length || 0;
    const unpaidCount =
        insurance?.filter(
            (p) => p.status === 'unpaid' || p.status === 'partial',
        ).length || 0;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reception', href: '/reception' },
                { title: 'Insurance', href: '/reception/insurance' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4">
                <PageHeader
                    icon={<Shield className="h-6 w-6" />}
                    title="Insurance Claims"
                    subtitle="View and manage insurance invoices and claims"
                />

                {/* Insurance Table */}
                <div className="mt-6">
                    <ReusableTable
                        title="Insurance Records"
                        columns={columns}
                        data={insurance || []}
                        actions={actions}
                        loading={loading}
                        filterPlaceholder="Search by invoice or patient..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="created_at"
                        emptyMessage="No insurance records found"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}

import { Head, usePage } from '@inertiajs/react';
import {
    BackpackIcon,
    Package,
    X,
    Clock,
    User,
    Calendar,
    FileText,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import Http from '@/utils/Http';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Returns',
        href: '/bulkstore/returns',
    },
];

interface ReturnItem {
    id: number;
    product_id: number;
    product_name: string;
    batch_number: string;
    quantity: number;
    reason: string;
    notes: string | null;
    created_at: string;
}

interface ReturnMovement {
    id: number;
    movement_uuid: string;
    product_id: number;
    batch_number: string;
    type: string;
    quantity: number;
    reason: string;
    notes: string | null;
    performed_by: number | null;
    approved_by: number | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    product: {
        id: number;
        product_name: string;
        product_code: string;
        strength: string | null;
        form: string | null;
    };
    performer: {
        id: number;
        name: string;
        email: string;
    } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    return: {
        label: 'Returned',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
};

export default function Returns() {
    const { props } = usePage();
    const { auth } = props;

    const [loading, setLoading] = useState(false);
    const [returns, setReturns] = useState<ReturnMovement[]>([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 1,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        from_date: '',
        to_date: '',
        product_id: '',
    });

    // Format helpers
    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return 'ZK0.00';
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
            .format(num)
            .replace('ZMW', 'ZK');
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Fetch returns history
    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (filters.from_date) params.from_date = filters.from_date;
            if (filters.to_date) params.to_date = filters.to_date;
            if (filters.product_id) params.product_id = filters.product_id;

            const response = await Http.get('/bulk-store/returns/history', {
                params,
            });
            const data = response.data;

            setReturns(data.data || []);
            setPagination({
                currentPage: data.current_page || 1,
                pageSize: data.per_page || 20,
                totalItems: data.total || 0,
                totalPages: data.last_page || 1,
            });
        } catch (error) {
            console.error('Failed to fetch returns:', error);
            toast.error('Failed to load return history');
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.pageSize, searchTerm, filters]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    // Handle refresh
    const handleRefresh = () => {
        fetchReturns();
        toast.success('Data refreshed');
    };

    // Handle view return details
    const handleView = (row: ReturnMovement) => {
        toast.success(`Viewing return #${row.movement_uuid}`);
        // You can open a modal or navigate to a details page
    };

    // Table columns
    const columns: Column<ReturnMovement>[] = [
        {
            id: 'id',
            label: 'Return ID',
            minWidth: 100,
            format: (value, row) => (
                <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                    #RET-{row.id}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'product',
            label: 'Product',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {row.product?.product_name || 'N/A'}
                    </p>
                    {row.product?.strength && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.product.strength} - {row.product.form || 'N/A'}
                        </p>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'batch_number',
            label: 'Batch #',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'quantity',
            label: 'Quantity',
            minWidth: 80,
            align: 'right',
            format: (value) => (
                <span className="font-semibold text-red-600 dark:text-red-400">
                    -{Math.abs(value)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'reason',
            label: 'Reason',
            minWidth: 120,
            format: (value) => {
                const reasons: Record<
                    string,
                    { label: string; color: string }
                > = {
                    Damaged: {
                        label: 'Damaged',
                        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    },
                    Expired: {
                        label: 'Expired',
                        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    },
                    'Wrong Product': {
                        label: 'Wrong Product',
                        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                    },
                    'Quantity Difference': {
                        label: 'Qty Difference',
                        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                    },
                    'Quality Issue': {
                        label: 'Quality Issue',
                        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                    },
                };
                const config = reasons[value] || {
                    label: value || 'Other',
                    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                };
                return (
                    <Badge className={`${config.color} font-medium`}>
                        {config.label}
                    </Badge>
                );
            },
            sortable: true,
        },
        {
            id: 'performer',
            label: 'Returned By',
            minWidth: 100,
            format: (value, row) => (
                <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {row.performer?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            id: 'created_at',
            label: 'Date',
            minWidth: 120,
            format: (value) => (
                <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(value)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(value)}
                    </p>
                </div>
            ),
            sortable: true,
        },
    ];

    // Actions
    const actions: Action<ReturnMovement>[] = [
        {
            label: 'View',
            icon: <FileText className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
    ];

    // Filter options for the table
    const statusOptions = [{ value: 'return', label: 'Returned' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Returns" />

            <div className="p-6">
                <PageHeader
                    icon={<BackpackIcon className="h-6 w-6" />}
                    title="Returns"
                    subtitle="Manage product returns in the bulk store."
                />

                {/* Table */}
                <div className="mt-6">
                    <ReusableTable
                        columns={columns}
                        data={returns}
                        actions={actions}
                        loading={loading}
                        title="Return History"
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        defaultRowsPerPage={20}
                        defaultOrderBy="created_at"
                        defaultOrder="desc"
                        filterPlaceholder="Search by product, batch, reason..."
                        statusFilterKey="type"
                        statusOptions={statusOptions}
                        additionalFilters={[
                            {
                                key: 'from_date',
                                label: 'From Date',
                                type: 'date',
                                value: filters.from_date,
                                onChange: (value) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        from_date: value,
                                    })),
                            },
                            {
                                key: 'to_date',
                                label: 'To Date',
                                type: 'date',
                                value: filters.to_date,
                                onChange: (value) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        to_date: value,
                                    })),
                            },
                        ]}
                        emptyMessage="No returns found"
                        onSearchChange={(value) => {
                            setSearchTerm(value);
                            setPagination((prev) => ({
                                ...prev,
                                currentPage: 1,
                            }));
                        }}
                        onPageChange={(page) => {
                            setPagination((prev) => ({
                                ...prev,
                                currentPage: page,
                            }));
                        }}
                        onPageSizeChange={(size) => {
                            setPagination((prev) => ({
                                ...prev,
                                pageSize: size,
                                currentPage: 1,
                            }));
                        }}
                        pagination={{
                            currentPage: pagination.currentPage,
                            pageSize: pagination.pageSize,
                            totalItems: pagination.totalItems,
                            totalPages: pagination.totalPages,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
}

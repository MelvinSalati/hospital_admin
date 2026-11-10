import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { Barcode, BarcodeIcon, Eye, Package } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import OrderItemsModal from '@/components/OrderItemsModal';
import OrderItemDetailsModal, {
    type OrderedItemDetails,
} from '@/components/OrderItemDetailsModal';
import { cn } from '@/lib/utils';
interface RequisitionItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string | null;
    quantity_requested: number | null;
    quantity_approved: number | null;
    quantity_fulfilled: number | null;
    unit: string | null;
    estimated_unit_price: number | null;
    estimated_total: number | null;
    batch_number: string | null;
    expiry_date: string | null;
    status: string | null;
    notes: string | null;
}

interface OrderedItem {
    id: number;
    requisition_uuid: string;
    requisition_number: string;
    status: string | null;
    priority: string | null;
    requested_at: string | null;
    required_by_date: string | null;
    estimated_total: number | null;
    items_count: number;
    department: string | null;
    requested_by: string | null;
    justification: string | null;
    items: RequisitionItem[];
}

export default function BulkStore() {
    const { orderedItems, auth } = usePage().props as {
        orderedItems?: OrderedItem[];
        auth: any;
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailsItem, setDetailsItem] = useState<OrderedItem | null>(null);

    const columns: Column<OrderedItem>[] = [
        {
            id: 'requisition_number',
            label: 'Order #',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                        <Barcode size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-800">
                            {value ?? `REQ-${row.id}`}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                            {row.requisition_uuid?.slice(0, 8)}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            sortable: true,
            filterable: true,
            format: (value) => (
                <span className="text-sm text-slate-700">{value ?? '—'}</span>
            ),
        },
        {
            id: 'requested_by',
            label: 'Requested By',
            format: (value) => (
                <span className="text-sm text-slate-700">{value ?? '—'}</span>
            ),
        },
        {
            id: 'items_count',
            label: 'Items',
            sortable: true,
            format: (value) => (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
                    <Package size={12} />
                    {value ?? 0}
                </span>
            ),
        },
        {
            id: 'estimated_total',
            label: 'Total',
            sortable: true,
            format: (value) => (
                <span className="text-sm font-medium text-slate-800 tabular-nums">
                    {value != null ? `$${Number(value).toFixed(2)}` : '—'}
                </span>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: true,
            format: (value) => {
                const map: Record<string, string> = {
                    low: 'bg-slate-100 text-slate-600 border-slate-200',
                    normal: 'bg-slate-100 text-slate-600 border-slate-200',
                    medium: 'bg-amber-50 text-amber-700 border-amber-200',
                    high: 'bg-orange-50 text-orange-700 border-orange-200',
                    urgent: 'bg-red-50 text-red-700 border-red-200',
                };
                const cls = map[value ?? ''] ?? map.normal;
                return (
                    <span
                        className={cn(
                            'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize',
                            cls,
                        )}
                    >
                        {value ?? 'Normal'}
                    </span>
                );
            },
        },
        {
            id: 'requested_at',
            label: 'Requested',
            sortable: true,
            format: (value) =>
                value ? (
                    <div className="text-xs text-slate-600">
                        <div>{new Date(value).toLocaleDateString()}</div>
                        <div className="text-slate-400">
                            {new Date(value).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400">—</span>
                ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                pending: 'warning',
                approved: 'info',
                fulfilled: 'success',
                completed: 'success',
                rejected: 'error',
                cancelled: 'error',
            },
            format: (value) => {
                const config: Record<
                    string,
                    { label: string; badge: string; dot: string }
                > = {
                    pending: {
                        label: 'Pending',
                        badge: 'bg-amber-50 text-amber-700 border-amber-200',
                        dot: 'bg-amber-500',
                    },
                    approved: {
                        label: 'Approved',
                        badge: 'bg-blue-50 text-blue-700 border-blue-200',
                        dot: 'bg-blue-500',
                    },
                    fulfilled: {
                        label: 'Fulfilled',
                        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        dot: 'bg-emerald-500',
                    },
                    completed: {
                        label: 'Completed',
                        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        dot: 'bg-emerald-500',
                    },
                    rejected: {
                        label: 'Rejected',
                        badge: 'bg-red-50 text-red-700 border-red-200',
                        dot: 'bg-red-500',
                    },
                    cancelled: {
                        label: 'Cancelled',
                        badge: 'bg-slate-100 text-slate-600 border-slate-200',
                        dot: 'bg-slate-400',
                    },
                };
                const cfg = config[value ?? ''] ?? config.pending;
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            cfg.badge,
                        )}
                    >
                        <span
                            className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)}
                        />
                        {cfg.label}
                    </span>
                );
            },
        },
    ];

    // ─── Row action: open details ───
    const actions: Action<OrderedItem>[] = [
        {
            label: 'View Details',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => setDetailsItem(row),
        },
    ];

    const handleOrderSubmit = () => {
        setIsModalOpen(false);
        router.reload({ only: ['orderedItems'] });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nurses', href: '/bulk-store' },
                { title: 'Bulk Store', href: '' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <PageHeader
                    icon={<BarcodeIcon className="h-5 w-5" />}
                    title="Bulk Store"
                    subtitle="Order from bulk store"
                    tabVariant="underline"
                    actions={[
                        {
                            label: 'Order from Bulk Store',
                            onClick: () => setIsModalOpen(true),
                        },
                    ]}
                    defaultTabId="overview"
                />

                <ReusableTable
                    title="Ordered Items"
                    columns={columns}
                    data={orderedItems ?? []}
                    actions={actions} // ← add this
                    loading={false}
                    filterPlaceholder="Search by product..."
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    emptyMessage="No orders found. Start by ordering from the bulk store."
                    className="shadow-sm"
                />

                {/* Order creation modal */}
                <OrderItemsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleOrderSubmit}
                    authenticated={auth}
                    departmentId={auth?.user?.departmentId ?? 6}
                />

                {/* Details modal */}
                <OrderItemDetailsModal
                    isOpen={!!detailsItem}
                    onClose={() => setDetailsItem(null)}
                    item={detailsItem as OrderedItemDetails | null}
                />
            </div>
        </AppLayout>
    );
}

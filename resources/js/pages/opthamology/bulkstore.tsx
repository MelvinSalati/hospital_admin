import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import {
    Barcode,
    BarcodeIcon,
    Eye,
    Package,
    X,
    Calendar,
    User,
    Building2,
    Hash,
    Boxes,
} from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import OrderItemsModal from '@/components/OrderItemsModal';
import { cn } from '@/lib/utils';

type BulkStoreTab = 'ordered' | 'received' | 'products';

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

/** One row per product, built from the items of all requisitions. */
interface ProductSummary {
    id: number; // product_id
    product_name: string;
    product_code: string | null;
    unit: string | null;
    orders_count: number;
    total_requested: number;
    total_received: number;
    last_ordered_at: string | null;
}

// ─── Tabs config (rendered as PageHeader action buttons) ────
/** PageHeader button variant for the selected tab vs. the others. */
const TAB_ACTIVE_VARIANT = 'cyan';
const TAB_INACTIVE_VARIANT = 'outline';

/** Requisition statuses that count as "received". */
const RECEIVED_STATUSES = ['fulfilled', 'completed'];

const TABS: {
    key: BulkStoreTab;
    label: string;
    subtitle: string;
    tableTitle: string;
    filterPlaceholder: string;
    emptyMessage: string;
}[] = [
    {
        key: 'ordered',
        label: 'Ordered',
        subtitle: 'Orders placed with the bulk store that are not yet received',
        tableTitle: 'Ordered Items',
        filterPlaceholder: 'Search orders...',
        emptyMessage:
            'No pending orders. Start by ordering from the bulk store.',
    },
    {
        key: 'received',
        label: 'Received',
        subtitle: 'Orders that have been fulfilled by the bulk store',
        tableTitle: 'Received Items',
        filterPlaceholder: 'Search received orders...',
        emptyMessage: 'No received orders yet.',
    },
    {
        key: 'products',
        label: 'Products',
        subtitle:
            'Products ordered from the bulk store and quantities received',
        tableTitle: 'Products',
        filterPlaceholder: 'Search products...',
        emptyMessage: 'No products have been ordered yet.',
    },
];

// ─── Shared helpers ─────────────────────────────────────────
const formatMoney = (value: number | null | undefined) =>
    value != null ? `$${Number(value).toFixed(2)}` : '—';

const isReceived = (status: string | null | undefined) =>
    RECEIVED_STATUSES.includes((status ?? '').toLowerCase());

const priorityClasses: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    normal: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    urgent: 'bg-red-50 text-red-700 border-red-200',
};

const statusConfig: Record<
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

const StatusBadge = ({ value }: { value: string | null }) => {
    const cfg = statusConfig[value ?? ''] ?? statusConfig.pending;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                cfg.badge,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    );
};

export default function BulkStore() {
    const { orderedItems, auth } = usePage().props as {
        orderedItems?: OrderedItem[];
        auth: {
            user?: {
                name?: string;
                profile?: {
                    department_id?: number | string;
                    department?: string;
                };
            };
        };
    };

    const [activeTab, setActiveTab] = useState<BulkStoreTab>('ordered');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [drawerOrder, setDrawerOrder] = useState<OrderedItem | null>(null);

    const allOrders = useMemo<OrderedItem[]>(
        () => orderedItems ?? [],
        [orderedItems],
    );

    // Split orders into ordered (not yet received) and received
    const { orderedOrders, receivedOrders } = useMemo(() => {
        const ordered: OrderedItem[] = [];
        const received: OrderedItem[] = [];
        allOrders.forEach((order) => {
            if (isReceived(order.status)) received.push(order);
            else ordered.push(order);
        });
        return { orderedOrders: ordered, receivedOrders: received };
    }, [allOrders]);

    // Aggregate items across all requisitions into one row per product
    const products = useMemo<ProductSummary[]>(() => {
        const map = new Map<number, ProductSummary>();

        allOrders.forEach((order) => {
            const seenInThisOrder = new Set<number>();

            (order.items ?? []).forEach((item) => {
                let entry = map.get(item.product_id);
                if (!entry) {
                    entry = {
                        id: item.product_id,
                        product_name: item.product_name,
                        product_code: item.product_code,
                        unit: item.unit,
                        orders_count: 0,
                        total_requested: 0,
                        total_received: 0,
                        last_ordered_at: null,
                    };
                    map.set(item.product_id, entry);
                }

                if (!seenInThisOrder.has(item.product_id)) {
                    entry.orders_count += 1;
                    seenInThisOrder.add(item.product_id);
                }

                entry.total_requested += Number(item.quantity_requested ?? 0);
                entry.total_received += Number(item.quantity_fulfilled ?? 0);

                if (
                    order.requested_at &&
                    (!entry.last_ordered_at ||
                        new Date(order.requested_at) >
                            new Date(entry.last_ordered_at))
                ) {
                    entry.last_ordered_at = order.requested_at;
                }
            });
        });

        return Array.from(map.values()).sort((a, b) =>
            a.product_name.localeCompare(b.product_name),
        );
    }, [allOrders]);

    const counts: Record<BulkStoreTab, number> = {
        ordered: orderedOrders.length,
        received: receivedOrders.length,
        products: products.length,
    };

    const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];

    // Tabs as PageHeader action buttons (label carries the live count)
    const headerActions = [
        ...TABS.map((tab) => ({
            label: `${tab.label} (${counts[tab.key]})`,
            variant:
                tab.key === activeTab
                    ? TAB_ACTIVE_VARIANT
                    : TAB_INACTIVE_VARIANT,
            onClick: () => setActiveTab(tab.key),
        })),
        {
            label: 'Order from Bulk Store',
            onClick: () => setIsModalOpen(true),
        },
    ];

    // ─── Order columns (Ordered + Received tabs) ────────────
    const orderColumns: Column<OrderedItem>[] = [
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
                    {formatMoney(value)}
                </span>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: true,
            format: (value) => {
                const cls =
                    priorityClasses[value ?? ''] ?? priorityClasses.normal;
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
            format: (value) => <StatusBadge value={value} />,
        },
    ];

    const orderActions: Action<OrderedItem>[] = [
        {
            label: 'View Items',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => setDrawerOrder(row),
        },
    ];

    // ─── Product columns (Products tab) ─────────────────────
    const productColumns: Column<ProductSummary>[] = [
        {
            id: 'product_name',
            label: 'Product',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                        <Package size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                            {value}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                            {row.product_code ?? `PID ${row.id}`}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'unit',
            label: 'Unit',
            sortable: true,
            format: (value) => (
                <span className="text-sm text-slate-700">{value ?? '—'}</span>
            ),
        },
        {
            id: 'orders_count',
            label: 'Orders',
            sortable: true,
            format: (value) => (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
                    <Hash size={12} />
                    {value ?? 0}
                </span>
            ),
        },
        {
            id: 'total_requested',
            label: 'Qty Ordered',
            sortable: true,
            format: (value) => (
                <span className="text-sm font-medium text-slate-800 tabular-nums">
                    {value ?? 0}
                </span>
            ),
        },
        {
            id: 'total_received',
            label: 'Qty Received',
            sortable: true,
            format: (value) => (
                <span className="text-sm font-medium text-emerald-700 tabular-nums">
                    {value ?? 0}
                </span>
            ),
        },
        {
            id: 'last_ordered_at',
            label: 'Last Ordered',
            sortable: true,
            format: (value) =>
                value ? (
                    <span className="text-xs text-slate-600">
                        {new Date(value).toLocaleDateString()}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                ),
        },
    ];

    const handleOrderSubmit = () => {
        setIsModalOpen(false);
        router.reload({ only: ['orderedItems'] });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Altaf Memorial Hospital', href: '/bulk-store' },
                { title: 'Opthalmology', href: '/bulk-store' },
                { title: 'Bulk Store', href: '' },
            ]}
        >
            <PageHeader
                icon={<BarcodeIcon className="h-5 w-5" />}
                title="Bulk Store"
                subtitle={activeTabConfig.subtitle}
                tabVariant="underline"
                actions={headerActions}
                defaultTabId="overview"
            />
            <div className="h-full space-y-4 bg-blue-50 p-4">
                {activeTab === 'products' ? (
                    <ReusableTable
                        key="products"
                        title={activeTabConfig.tableTitle}
                        columns={productColumns}
                        data={products}
                        actions={[]}
                        loading={false}
                        filterPlaceholder={activeTabConfig.filterPlaceholder}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        emptyMessage={activeTabConfig.emptyMessage}
                        className="shadow-sm"
                    />
                ) : (
                    <ReusableTable
                        key={activeTab}
                        title={activeTabConfig.tableTitle}
                        columns={orderColumns}
                        data={
                            activeTab === 'received'
                                ? receivedOrders
                                : orderedOrders
                        }
                        actions={orderActions}
                        loading={false}
                        filterPlaceholder={activeTabConfig.filterPlaceholder}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        emptyMessage={activeTabConfig.emptyMessage}
                        className="shadow-sm"
                    />
                )}

                <OrderItemsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleOrderSubmit}
                    authenticated={auth}
                    departmentId={auth?.user?.profile?.department_id}
                />

                <OrderDrawer
                    order={drawerOrder}
                    onClose={() => setDrawerOrder(null)}
                />
            </div>
        </AppLayout>
    );
}

/* ============================================================
 * Right-side sliding drawer (narrow, professional)
 * ============================================================ */
function OrderDrawer({
    order,
    onClose,
}: {
    order: OrderedItem | null;
    onClose: () => void;
}) {
    const open = !!order;
    const items = order?.items ?? [];

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
                aria-hidden={!open}
            />

            {/* Drawer panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Order items"
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* Header */}
                <header className="flex items-start justify-between gap-4 bg-blue-200 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600">
                            <Boxes size={15} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-white">
                                {order?.requisition_number ?? 'Requisition'}
                            </h2>
                            <p className="font-mono text-[10px] text-slate-400">
                                {order?.requisition_uuid?.slice(0, 12)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                        aria-label="Close drawer"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Meta strip — requested_by appears ONCE here */}
                {order && (
                    <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white px-4 py-3 text-xs">
                        <Meta
                            icon={<User size={12} />}
                            label="Requested by"
                            value={order.requested_by ?? '—'}
                        />
                        <Meta
                            icon={<Building2 size={12} />}
                            label="Department"
                            value={order.department ?? '—'}
                        />
                        <Meta
                            icon={<Calendar size={12} />}
                            label="Requested"
                            value={
                                order.requested_at
                                    ? new Date(
                                          order.requested_at,
                                      ).toLocaleDateString()
                                    : '—'
                            }
                        />
                        <Meta
                            icon={<Hash size={12} />}
                            label="Items"
                            value={`${order.items_count ?? items.length}`}
                        />
                        {order.justification && (
                            <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                                <span className="font-medium text-slate-500">
                                    Justification:{' '}
                                </span>
                                {order.justification}
                            </div>
                        )}
                    </div>
                )}

                {/* Item list */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {items.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                            <Package size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">
                                No items on this requisition.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {items.map((item, idx) => (
                                <li
                                    key={item.id}
                                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                                >
                                    {/* Top row: index + name (left) · qty (right) */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span className="mt-0.5 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {item.product_name}
                                                </p>
                                                <p className="font-mono text-[10px] text-slate-400">
                                                    {item.product_code ??
                                                        `PID ${item.product_id}`}
                                                    {item.unit
                                                        ? ` · ${item.unit}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-[9px] tracking-wide text-slate-400 uppercase">
                                                Qty
                                            </p>
                                            <p className="text-base font-semibold text-slate-800 tabular-nums">
                                                {item.quantity_requested ?? 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status + batch / expiry / notes */}
                                    {(item.status ||
                                        item.batch_number ||
                                        item.expiry_date ||
                                        item.notes) && (
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                            {item.status && (
                                                <StatusBadge
                                                    value={item.status}
                                                />
                                            )}
                                            {item.batch_number && (
                                                <span>
                                                    Batch:{' '}
                                                    <span className="font-mono text-slate-700">
                                                        {item.batch_number}
                                                    </span>
                                                </span>
                                            )}
                                            {item.expiry_date && (
                                                <span>
                                                    Expiry:{' '}
                                                    <span className="text-slate-700">
                                                        {new Date(
                                                            item.expiry_date,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </span>
                                            )}
                                            {item.notes && (
                                                <span className="basis-full text-slate-600">
                                                    <span className="font-medium text-slate-500">
                                                        Notes:{' '}
                                                    </span>
                                                    {item.notes}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ─── Professional footer with badges ─── */}
                {order && (
                    <footer className="relative border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3">
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <StatusBadge value={order.status} />
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize',
                                        priorityClasses[order.priority ?? ''] ??
                                            priorityClasses.normal,
                                    )}
                                >
                                    {order.priority ?? 'Normal'}
                                </span>
                            </div>

                            <div className="text-right">
                                <p className="text-[9px] tracking-wide text-slate-400 uppercase">
                                    Estimated total
                                </p>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">
                                    {formatMoney(order.estimated_total)}
                                </p>
                            </div>
                        </div>
                    </footer>
                )}
            </aside>
        </>
    );
}

/* ─── Small presentational helper ─────────────────────────── */
function Meta({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] tracking-wide text-slate-400 uppercase">
                {icon}
                {label}
            </p>
            <p className="truncate text-xs font-medium text-slate-700">
                {value}
            </p>
        </div>
    );
}

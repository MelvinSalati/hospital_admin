import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import {
    AlertTriangle,
    Barcode,
    BarcodeIcon,
    Building2,
    CalendarClock,
    CalendarDays,
    Eye,
    FileText,
    Package,
    User,
    X,
    ClipboardList,
} from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import OrderItemsModal from '@/components/OrderItemsModal';
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

// ─── Shared helpers ─────────────────────────────────────────
const formatMoney = (value: number | null | undefined) =>
    value != null ? `$${Number(value).toFixed(2)}` : '—';

const num = (v: number | null | undefined) => Number(v ?? 0);

const formatDate = (value: string | null | undefined) =>
    value
        ? new Date(value).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : '—';

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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [drawerOrder, setDrawerOrder] = useState<OrderedItem | null>(null);

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

    const actions: Action<OrderedItem>[] = [
        {
            label: 'View Items',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => setDrawerOrder(row),
        },
    ];

    const handleOrderSubmit = () => {
        setIsModalOpen(false);
        router.reload({ only: ['orderedItems'] });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ALtaf Memorial Hospital', href: '/bulk-store' },
                { title: 'Bulk Store', href: '' },
            ]}
        >
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
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <ReusableTable
                    title="Ordered Items"
                    columns={columns}
                    data={orderedItems ?? []}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search orders..."
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    emptyMessage="No orders found. Start by ordering from the bulk store."
                    className="shadow-sm"
                />

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
 * Right-side drawer
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

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Totals across all line items
    const totalRequested = items.reduce(
        (s, i) => s + num(i.quantity_requested),
        0,
    );
    const totalApproved = items.reduce(
        (s, i) => s + num(i.quantity_approved),
        0,
    );
    const totalFulfilled = items.reduce(
        (s, i) => s + num(i.quantity_fulfilled),
        0,
    );
    const overallPct =
        totalRequested > 0
            ? Math.min(100, Math.round((totalFulfilled / totalRequested) * 100))
            : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
                aria-hidden={!open}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Requisition details"
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-slate-50 shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* ─── Header ─── */}
                <header className="border-b border-slate-200 bg-white px-5 pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                                <ClipboardList size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                    Requisition
                                </p>
                                <h2 className="truncate font-mono text-base font-semibold text-slate-900">
                                    {order?.requisition_number ?? '—'}
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close drawer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {order && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <StatusBadge value={order.status} />
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize',
                                    priorityClasses[order.priority ?? ''] ??
                                        priorityClasses.normal,
                                )}
                            >
                                {order.priority ?? 'Normal'} priority
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                                #{order.requisition_uuid?.slice(0, 8)}
                            </span>
                        </div>
                    )}
                </header>

                {/* ─── Scrollable body ─── */}
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {order && (
                        <>
                            {/* Details card */}
                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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
                                        icon={<CalendarDays size={12} />}
                                        label="Requested on"
                                        value={formatDate(order.requested_at)}
                                    />
                                    <Meta
                                        icon={<CalendarClock size={12} />}
                                        label="Required by"
                                        value={formatDate(
                                            order.required_by_date,
                                        )}
                                    />
                                </div>

                                {order.justification && (
                                    <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                                        <FileText
                                            size={13}
                                            className="mt-0.5 shrink-0 text-slate-400"
                                        />
                                        <p className="leading-relaxed">
                                            {order.justification}
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* Fulfilment summary */}
                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                        Fulfilment
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-700 tabular-nums">
                                        {overallPct}%
                                    </span>
                                </div>

                                <ProgressBar
                                    pct={overallPct}
                                    className="mb-4 h-2"
                                />

                                <div className="grid grid-cols-3 divide-x divide-slate-100">
                                    <SummaryStat
                                        label="Requested"
                                        value={totalRequested}
                                    />
                                    <SummaryStat
                                        label="Approved"
                                        value={totalApproved}
                                    />
                                    <SummaryStat
                                        label="Fulfilled"
                                        value={totalFulfilled}
                                        accent
                                    />
                                </div>
                            </section>

                            {/* Line items */}
                            <section>
                                <div className="mb-2 flex items-center justify-between px-1">
                                    <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                        Line items
                                    </h3>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                                        {items.length}
                                    </span>
                                </div>

                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
                                        <Package
                                            size={28}
                                            className="mb-2 text-slate-300"
                                        />
                                        <p className="text-sm font-medium text-slate-600">
                                            No line items
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            This requisition has no products
                                            attached.
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="space-y-3">
                                        {items.map((item, idx) => (
                                            <ItemCard
                                                key={item.id}
                                                item={item}
                                                index={idx + 1}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                        {items.length} {items.length === 1 ? 'item' : 'items'} ·{' '}
                        {totalRequested} units requested
                    </p>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                        Close
                    </button>
                </footer>
            </aside>
        </>
    );
}

/* ─── Line item card ──────────────────────────────────────── */
function ItemCard({
    item,
    index,
}: {
    item: RequisitionItem;
    index: number;
}) {
    const requested = num(item.quantity_requested);
    const approved = num(item.quantity_approved);
    const fulfilled = num(item.quantity_fulfilled);
    const pct =
        requested > 0
            ? Math.min(100, Math.round((fulfilled / requested) * 100))
            : 0;
    const expiry = getExpiryState(item.expiry_date);

    return (
        <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-3">
                <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500">
                        {index}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {item.product_name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                            {item.product_code ?? `PID ${item.product_id}`}
                            {item.unit ? ` · ${item.unit}` : ''}
                        </p>
                    </div>
                </div>
                {item.status && <StatusBadge value={item.status} />}
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 bg-slate-50/60">
                <QtyCell label="Requested" value={requested} />
                <QtyCell label="Approved" value={approved} />
                <QtyCell label="Fulfilled" value={fulfilled} accent />
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 px-4 py-2.5">
                <ProgressBar pct={pct} className="h-1.5 flex-1" />
                <span className="w-9 text-right text-[10px] font-semibold text-slate-500 tabular-nums">
                    {pct}%
                </span>
            </div>

            {/* Batch / expiry / notes */}
            {(item.batch_number || item.expiry_date || item.notes) && (
                <div className="space-y-2 border-t border-slate-100 px-4 py-2.5 text-[11px]">
                    {(item.batch_number || item.expiry_date) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            {item.batch_number && (
                                <span className="text-slate-500">
                                    Batch{' '}
                                    <span className="font-mono font-medium text-slate-800">
                                        {item.batch_number}
                                    </span>
                                </span>
                            )}
                            {item.expiry_date && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium',
                                        expiry === 'expired' &&
                                            'bg-red-50 text-red-700',
                                        expiry === 'soon' &&
                                            'bg-amber-50 text-amber-700',
                                        expiry === 'ok' && 'text-slate-600',
                                    )}
                                >
                                    {expiry !== 'ok' && (
                                        <AlertTriangle size={11} />
                                    )}
                                    {expiry === 'expired'
                                        ? 'Expired'
                                        : 'Expires'}{' '}
                                    {formatDate(item.expiry_date)}
                                </span>
                            )}
                        </div>
                    )}
                    {item.notes && (
                        <p className="leading-relaxed text-slate-600">
                            <span className="font-medium text-slate-500">
                                Note:{' '}
                            </span>
                            {item.notes}
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}

/* ─── Helpers / small components ──────────────────────────── */
function getExpiryState(date: string | null): 'ok' | 'soon' | 'expired' {
    if (!date) return 'ok';
    const days = Math.ceil(
        (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return 'expired';
    if (days <= 90) return 'soon';
    return 'ok';
}

function ProgressBar({
    pct,
    className,
}: {
    pct: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'w-full overflow-hidden rounded-full bg-slate-100',
                className,
            )}
        >
            <div
                className={cn(
                    'h-full rounded-full transition-all duration-500',
                    pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500',
                )}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function SummaryStat({
    label,
    value,
    accent,
}: {
    label: string;
    value: number;
    accent?: boolean;
}) {
    return (
        <div className="px-3 text-center first:pl-0 last:pr-0">
            <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'mt-0.5 text-xl font-semibold tabular-nums',
                    accent ? 'text-emerald-600' : 'text-slate-900',
                )}
            >
                {value}
            </p>
        </div>
    );
}

function QtyCell({
    label,
    value,
    accent,
}: {
    label: string;
    value: number;
    accent?: boolean;
}) {
    return (
        <div className="px-3 py-2 text-center">
            <p className="text-[9px] tracking-wide text-slate-400 uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'text-sm font-semibold tabular-nums',
                    accent ? 'text-emerald-600' : 'text-slate-800',
                )}
            >
                {value}
            </p>
        </div>
    );
}

function Meta({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] tracking-wide text-slate-400 uppercase">
                {icon}
                {label}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                {value}
            </p>
        </div>
    );
}


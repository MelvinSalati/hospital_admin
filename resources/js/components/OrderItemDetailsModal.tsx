// resources/js/components/OrderItemDetailsModal.tsx
import {
    X,
    Package,
    Building2,
    User,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface RequisitionLineItem {
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

export interface OrderedItemDetails {
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
    items: RequisitionLineItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: OrderedItemDetails | null;
}

// ============================================
// HELPERS
// ============================================

const formatMoney = (v: number | null | undefined) =>
    v != null ? `$${Number(v).toFixed(2)}` : '—';

const formatDate = (v: string | null | undefined) => {
    if (!v) return '—';
    try {
        return new Date(v).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
};

const formatDateTime = (v: string | null | undefined) => {
    if (!v) return '—';
    try {
        return new Date(v).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
};

const getStatusConfig = (status: string | null) => {
    const map: Record<
        string,
        { label: string; badge: string; dot: string; icon: React.ReactNode }
    > = {
        pending: {
            label: 'Pending',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
            icon: <Clock size={12} />,
        },
        approved: {
            label: 'Approved',
            badge: 'bg-blue-50 text-blue-700 border-blue-200',
            dot: 'bg-blue-500',
            icon: <CheckCircle2 size={12} />,
        },
        fulfilled: {
            label: 'Fulfilled',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
            icon: <CheckCircle2 size={12} />,
        },
        completed: {
            label: 'Completed',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
            icon: <CheckCircle2 size={12} />,
        },
        rejected: {
            label: 'Rejected',
            badge: 'bg-red-50 text-red-700 border-red-200',
            dot: 'bg-red-500',
            icon: <AlertCircle size={12} />,
        },
        cancelled: {
            label: 'Cancelled',
            badge: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
            icon: <AlertCircle size={12} />,
        },
    };
    return map[status ?? ''] ?? map.pending;
};

// ============================================
// SMALL PIECES
// ============================================

function StatusBadge({ status }: { status: string | null }) {
    const cfg = getStatusConfig(status);
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                cfg.badge,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function MetaBlock({
    label,
    value,
    icon,
    capitalize,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    capitalize?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 flex items-center gap-1.5 text-sm text-slate-800',
                    capitalize && 'capitalize',
                )}
            >
                {icon && <span className="text-slate-400">{icon}</span>}
                <span className="truncate">{value ?? '—'}</span>
            </p>
        </div>
    );
}

// ============================================
// MAIN MODAL
// ============================================

export default function OrderItemDetailsModal({
    isOpen,
    onClose,
    item,
}: Props) {
    // Mount/unmount transition state
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // delay one frame so the enter transition can play
            const id = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(id);
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    if (!isOpen || !item) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            onClick={onClose}
            className={cn(
                // Backdrop
                'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4',
                'bg-slate-900/50 backdrop-blur-sm',
                'transition-opacity duration-200 ease-out',
                visible ? 'opacity-100' : 'opacity-0',
            )}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    // Card
                    'relative flex max-h-[90vh] max-w-4xl flex-col',
                    'overflow-hidden rounded-2xl bg-white',
                    'ring-1 ring-slate-900/5',
                    'shadow-2xl shadow-slate-900/20',
                    // Enter transition
                    'transition-all duration-200 ease-out',
                    visible
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'translate-y-4 scale-95 opacity-0',
                )}
            >
                {/* ─── Header ─── */}
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="border--200 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-blue-600 text-white shadow-sm">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2
                                    id="order-details-title"
                                    className="truncate font-mono text-sm font-semibold text-slate-900 sm:text-base"
                                >
                                    {item.requisition_number}
                                </h2>
                                <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                                {item.requisition_uuid}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className={cn(
                            'shrink-0 rounded-full p-2 text-slate-400',
                            'transition-colors',
                            'hover:bg-slate-100 hover:text-slate-600',
                            'focus:ring-2 focus:ring-slate-300 focus:outline-none',
                        )}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ─── Body ─── */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-blue-50 p-5">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
                        <MetaBlock
                            label="Department"
                            value={item.department}
                            icon={<Building2 size={13} />}
                        />
                        <MetaBlock
                            label="Requested By"
                            value={item.requested_by}
                            icon={<User size={13} />}
                        />
                        <MetaBlock
                            label="Requested At"
                            value={formatDateTime(item.requested_at)}
                            icon={<Clock size={13} />}
                        />
                        <MetaBlock
                            label="Priority"
                            value={item.priority ?? 'Normal'}
                            capitalize
                        />
                    </div>

                    {/* Products table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-slate-500" />
                                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                    Products Ordered
                                </h3>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                                {item.items_count} item
                                {item.items_count === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            Product
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Qty
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Unit
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Unit Price
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Total
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Batch
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Expiry
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {item.items.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-10 text-center text-xs text-slate-400"
                                            >
                                                No items in this requisition
                                            </td>
                                        </tr>
                                    ) : (
                                        item.items.map((line) => (
                                            <tr
                                                key={line.id}
                                                className="transition-colors hover:bg-slate-50"
                                            >
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                                                            {line.product_name?.[0]?.toUpperCase() ??
                                                                '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-slate-800">
                                                                {
                                                                    line.product_name
                                                                }
                                                            </p>
                                                            <p className="font-mono text-[10px] text-slate-400">
                                                                P
                                                                {String(
                                                                    line.product_id,
                                                                ).padStart(
                                                                    6,
                                                                    '0',
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                                                    {line.quantity_requested ??
                                                        '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600">
                                                    {line.unit ?? '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                                                    {formatMoney(
                                                        line.estimated_unit_price,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-800 tabular-nums">
                                                    {formatMoney(
                                                        line.estimated_total,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                                    {line.batch_number ?? '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                                    {line.expiry_date
                                                        ? formatDate(
                                                              line.expiry_date,
                                                          )
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {item.items.length > 0 && (
                                    <tfoot className="border-t border-slate-200 bg-slate-50/70">
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-2.5 text-right text-[10px] font-semibold tracking-wide text-slate-500 uppercase"
                                            >
                                                Order Total
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                                                {formatMoney(
                                                    item.estimated_total,
                                                )}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Justification */}
                    {item.justification && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center gap-2">
                                <FileText
                                    size={13}
                                    className="text-slate-500"
                                />
                                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                    Justification
                                </h3>
                            </div>
                            <p className="text-sm whitespace-pre-wrap text-slate-700">
                                {item.justification}
                            </p>
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white px-5 py-3">
                    <p className="hidden text-[11px] text-slate-400 sm:block">
                        Press{' '}
                        <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px]">
                            Esc
                        </kbd>{' '}
                        to close
                    </p>
                    <button
                        onClick={onClose}
                        className={cn(
                            'rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white',
                            'transition-colors hover:bg-slate-800',
                            'focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none',
                        )}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

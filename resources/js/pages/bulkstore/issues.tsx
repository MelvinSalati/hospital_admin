// pages/bulkstore/issues.tsx
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BoxesIcon,
    Building2,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    Loader2,
    MessageSquare,
    Minus,
    PackageX,
    Plus,
    RotateCcw,
    Search,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';

// ---------- Types matching the grouped payload ----------
interface RequisitionItem {
    item_id: number;
    product_id: number;
    product_name: string;
    product_code: string | null;
    unit: string | null;
    quantity_requested: number;
    quantity_approved: number;
    quantity_fulfilled: number;
    quantity_rejected: number;
    /** Optional: bulk store balance for this product. Enables stock checks in the drawer. */
    stock_available?: number | null;
}

interface RequisitionGroup {
    requisition_id: number;
    requisition_no: string;
    department_id: number;
    department_name: string;
    department_code: string;
    priority: string;
    requested_at: string;
    required_by: string | null;
    requested_by: string;
    items: RequisitionItem[];
    item_count: number;
    requested_total: number;
    fulfilled_total: number;
}

type Decision = 'accept' | 'reject' | 'stock_out';

interface Draft {
    decision: Decision;
    qty: number;
    comment: string;
    commentOpen: boolean;
}

const breadcrumbs = [
    { title: 'Bulk Store', href: '/bulkstore' },
    { title: 'Issue Products', href: '/bulkstore/issue' },
];

// ---------- Helpers ----------
const num = (v: unknown) => Number(v) || 0;

/** Units still open on a line: requested minus issued minus rejected. */
const balanceOf = (it: RequisitionItem) =>
    Math.max(
        0,
        num(it.quantity_requested) -
            num(it.quantity_fulfilled) -
            num(it.quantity_rejected),
    );

/** Most that can be issued now: the balance, capped by stock on hand when known. */
const maxIssuable = (it: RequisitionItem) => {
    const bal = balanceOf(it);
    return it.stock_available == null
        ? bal
        : Math.max(0, Math.min(bal, num(it.stock_available)));
};

const defaultDraft = (it: RequisitionItem): Draft => {
    const max = maxIssuable(it);
    return {
        decision:
            max === 0 && it.stock_available != null ? 'stock_out' : 'accept',
        qty: max,
        comment: '',
        commentOpen: false,
    };
};

const priorityClass = (p: string) => {
    const v = (p ?? '').toLowerCase();
    if (v === 'urgent' || v === 'emergency')
        return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300';
    if (v === 'high')
        return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-300';
    return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const decisionMeta: Record<
    Decision,
    { label: string; icon: typeof CheckCircle2; active: string }
> = {
    accept: {
        label: 'Accept',
        icon: CheckCircle2,
        active: 'bg-emerald-600 text-white border-emerald-600',
    },
    reject: {
        label: 'Reject',
        icon: XCircle,
        active: 'bg-red-600 text-white border-red-600',
    },
    stock_out: {
        label: 'Stock out',
        icon: PackageX,
        active: 'bg-amber-500 text-white border-amber-500',
    },
};

export default function Issues() {
    const { issues } = usePage<{ issues: RequisitionGroup[] }>().props;

    // ----- Drawer state -----
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [searchItem, setSearchItem] = useState('');
    const [drafts, setDrafts] = useState<Record<number, Draft>>({});
    const [submitting, setSubmitting] = useState(false);

    // Always read the live row so the drawer refreshes after router.reload
    const selected = useMemo(
        () =>
            (issues ?? []).find((g) => g.requisition_id === selectedId) ?? null,
        [issues, selectedId],
    );
    const drawerOpen = selected !== null;

    const getDraft = (it: RequisitionItem): Draft =>
        drafts[it.item_id] ?? defaultDraft(it);

    const patchDraft = (it: RequisitionItem, patch: Partial<Draft>) =>
        setDrafts((prev) => ({
            ...prev,
            [it.item_id]: {
                ...(prev[it.item_id] ?? defaultDraft(it)),
                ...patch,
            },
        }));

    const openDrawer = (group: RequisitionGroup) => {
        setDrafts({});
        setSearchItem('');
        setSelectedId(group.requisition_id);
    };

    const closeDrawer = () => {
        if (submitting) return;
        setSelectedId(null);
        setDrafts({});
    };

    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDrawer();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drawerOpen, submitting]);

    const setDecision = (it: RequisitionItem, decision: Decision) => {
        const cur = getDraft(it);
        patchDraft(it, {
            decision,
            qty:
                decision === 'accept'
                    ? Math.max(cur.qty, 0) || maxIssuable(it)
                    : 0,
            commentOpen: decision !== 'accept' ? true : cur.commentOpen,
        });
    };

    const setQty = (it: RequisitionItem, next: number) => {
        const qty = Math.max(0, Math.min(maxIssuable(it), next));
        patchDraft(it, { qty });
    };

    // ----- Line validation -----
    const lineError = (it: RequisitionItem, d: Draft): string | null => {
        const bal = balanceOf(it);
        if (d.decision === 'accept') {
            if (d.qty <= 0) return 'Enter a quantity to issue';
            if (d.qty < bal && !d.comment.trim())
                return 'Add a comment for the short issue';
        }
        if (d.decision === 'reject' && !d.comment.trim())
            return 'A reason is required to reject';
        return null;
    };

    // ----- Submit -----
    const openLines = (selected?.items ?? []).filter((it) => balanceOf(it) > 0);

    const summary = openLines.reduce(
        (acc, it) => {
            const d = getDraft(it);
            if (d.decision === 'accept') {
                acc.accept += 1;
                acc.units += d.qty;
            } else if (d.decision === 'reject') acc.reject += 1;
            else acc.stockOut += 1;
            if (lineError(it, d)) acc.errors += 1;
            return acc;
        },
        { accept: 0, reject: 0, stockOut: 0, units: 0, errors: 0 },
    );

    const csrf = () =>
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') || '';

    const submitDecisions = async () => {
        if (!selected || openLines.length === 0) return;
        if (summary.errors > 0) {
            toast.error('Resolve the highlighted lines first');
            return;
        }

        setSubmitting(true);
        const done: number[] = [];
        let failed = 0;

        for (const it of openLines) {
            const d = getDraft(it);
            try {
                const res = await Http.post('bulk-store/issue-stock', {
                    issue_id: it.item_id,
                    requisition_id: selected.requisition_id,
                    product_id: it.product_id,
                    department_id: selected.department_id,
                    action: d.decision === 'accept' ? 'issue' : d.decision, // 'reject' | 'stock_out'
                    quantity: d.decision === 'accept' ? d.qty : 0,
                    comment: d.comment.trim() || null,
                });
                if (!res) {
                    Notiflix.Notify.failure(res);
                }
                done.push(it.item_id);
            } catch (e: any) {
                failed += 1;
                toast.error(`${it.product_name}: ${e.message || 'Failed'}`);
            }
        }

        setSubmitting(false);

        if (done.length > 0) {
            toast.success(
                `${done.length} line${done.length > 1 ? 's' : ''} processed`,
            );
            // Drop drafts of processed lines; failed ones keep their edits
            setDrafts((prev) => {
                const next = { ...prev };
                done.forEach((id) => delete next[id]);
                return next;
            });
            router.reload({ only: ['issues'] });
        }
        if (failed === 0 && done.length === openLines.length) {
            // everything processed — leave the drawer open briefly via reload, then close
            setTimeout(() => setSelectedId(null), 400);
        }
    };

    // ----- Table columns -----
    const columns: Column<RequisitionGroup>[] = [
        {
            id: 'requisition_no',
            label: 'Requisition',
            minWidth: 160,
            format: (v, row) => (
                <div>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {v}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.priority}
                    </p>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'department_name',
            label: 'Department',
            minWidth: 200,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                            {row.department_name}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.department_code}
                        </p>
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'item_count',
            label: 'Items',
            minWidth: 80,
            align: 'center',
            format: (v) => (
                <Badge variant="outline" className="text-xs">
                    {v} items
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'requested_total',
            label: 'Requested',
            minWidth: 100,
            align: 'right',
            format: (v) => (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {Number(v).toLocaleString()}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'fulfilled_total',
            label: 'Fulfilled',
            minWidth: 100,
            align: 'right',
            format: (v) => (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {Number(v).toLocaleString()}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'requested_by',
            label: 'Requested By',
            minWidth: 120,
            format: (v) => (
                <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {v || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            id: 'requested_at',
            label: 'Date',
            minWidth: 120,
            format: (v) => (
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {v ? new Date(v).toLocaleDateString() : 'N/A'}
                    </span>
                </div>
            ),
            sortable: true,
        },
    ];

    const actions: Action<RequisitionGroup>[] = [
        {
            label: 'Review & Issue',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: openDrawer,
        },
    ];

    const filteredItems = (selected?.items ?? []).filter((it) => {
        const q = searchItem.toLowerCase();
        return (
            (it.product_name ?? '').toLowerCase().includes(q) ||
            (it.product_code ?? '').toLowerCase().includes(q)
        );
    });

    const progress =
        selected && num(selected.requested_total) > 0
            ? Math.min(
                  100,
                  Math.round(
                      (num(selected.fulfilled_total) /
                          num(selected.requested_total)) *
                          100,
                  ),
              )
            : 0;

    // ----- One line in the drawer -----
    const renderLine = (it: RequisitionItem) => {
        const requested = num(it.quantity_requested);
        const fulfilled = num(it.quantity_fulfilled);
        const rejected = num(it.quantity_rejected);
        const balance = balanceOf(it);
        const unit = it.unit || 'unit';
        const stock = it.stock_available;
        const max = maxIssuable(it);
        const closed = balance === 0;

        const d = getDraft(it);
        const err = !closed ? lineError(it, d) : null;
        const short = d.decision === 'accept' && d.qty > 0 && d.qty < balance;
        const stockTone =
            stock == null
                ? ''
                : stock <= 0
                  ? 'text-red-600 dark:text-red-400'
                  : stock < balance
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400';

        return (
            <div
                key={it.item_id}
                className={`rounded-md border bg-white dark:bg-slate-900/50 ${
                    err
                        ? 'border-red-300 dark:border-red-800/70'
                        : 'border-slate-200 dark:border-slate-700'
                } ${closed ? 'opacity-70' : ''}`}
            >
                {/* Row 1 — product + stock */}
                <div className="flex items-start justify-between gap-3 px-3 pt-2.5">
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            {it.product_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {it.product_code ? `${it.product_code} · ` : ''}
                            {unit}
                        </p>
                    </div>
                    {stock != null && !closed && (
                        <div className="shrink-0 text-right">
                            <p className="text-[10px] text-slate-400">
                                On hand
                            </p>
                            <p
                                className={`text-xs font-semibold tabular-nums ${stockTone}`}
                            >
                                {num(stock).toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Row 2 — quantities */}
                <div className="mt-2 grid grid-cols-4 gap-px border-y border-slate-100 bg-slate-100 text-center dark:border-slate-700/60 dark:bg-slate-700/60">
                    {[
                        {
                            k: 'Ordered',
                            v: requested,
                            c: 'text-slate-700 dark:text-slate-200',
                        },
                        {
                            k: 'Issued',
                            v: fulfilled,
                            c: 'text-emerald-600 dark:text-emerald-400',
                        },
                        {
                            k: 'Rejected',
                            v: rejected,
                            c: 'text-red-600 dark:text-red-400',
                        },
                        {
                            k: 'Balance',
                            v: balance,
                            c: 'text-blue-700 dark:text-blue-300',
                        },
                    ].map((s) => (
                        <div
                            key={s.k}
                            className="bg-slate-50 py-1.5 dark:bg-slate-800/80"
                        >
                            <p className="text-[10px] text-slate-400">{s.k}</p>
                            <p
                                className={`text-xs font-semibold tabular-nums ${s.c}`}
                            >
                                {s.v.toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Row 3 — workflow */}
                {closed ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Line closed
                    </div>
                ) : (
                    <div className="space-y-2 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Decision segmented control */}
                            <div className="inline-flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                {(Object.keys(decisionMeta) as Decision[]).map(
                                    (key) => {
                                        const m = decisionMeta[key];
                                        const Icon = m.icon;
                                        const on = d.decision === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                disabled={submitting}
                                                onClick={() =>
                                                    setDecision(it, key)
                                                }
                                                className={`inline-flex items-center gap-1 border-r px-2 py-1 text-[11px] font-medium transition-colors last:border-r-0 ${
                                                    on
                                                        ? m.active
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <Icon className="h-3 w-3" />
                                                {m.label}
                                            </button>
                                        );
                                    },
                                )}
                            </div>

                            {/* Quantity stepper — accept only */}
                            {d.decision === 'accept' && (
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={submitting || d.qty <= 0}
                                        onClick={() => setQty(it, d.qty - 1)}
                                        className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={max}
                                        value={d.qty}
                                        disabled={submitting}
                                        onChange={(e) =>
                                            setQty(
                                                it,
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                        className="h-6 w-14 [appearance:textfield] rounded border border-slate-200 text-center text-xs tabular-nums focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={submitting || d.qty >= max}
                                        onClick={() => setQty(it, d.qty + 1)}
                                        className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                    <span className="text-[10px] text-slate-400">
                                        / {max} {unit}
                                    </span>
                                    {d.qty !== max && (
                                        <button
                                            type="button"
                                            onClick={() => setQty(it, max)}
                                            title="Reset to maximum"
                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    patchDraft(it, {
                                        commentOpen: !d.commentOpen,
                                    })
                                }
                                title="Comment"
                                className={`rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                    d.comment.trim()
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-400'
                                } ${d.decision === 'accept' ? '' : 'ml-auto'}`}
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Flags */}
                        {(short ||
                            (stock != null &&
                                stock < balance &&
                                d.decision === 'accept')) && (
                            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                                <span>
                                    {stock != null && stock < balance
                                        ? `Only ${num(stock)} on hand — ${balance - max} ${unit} will remain open.`
                                        : `Short issue: ${balance - d.qty} ${unit} will remain open.`}
                                </span>
                            </div>
                        )}
                        {d.decision === 'stock_out' && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Nothing issued. The line stays open and is
                                flagged as out of stock.
                            </p>
                        )}

                        {/* Comment */}
                        {(d.commentOpen ||
                            d.decision !== 'accept' ||
                            short) && (
                            <textarea
                                rows={2}
                                value={d.comment}
                                disabled={submitting}
                                onChange={(e) =>
                                    patchDraft(it, { comment: e.target.value })
                                }
                                placeholder={
                                    d.decision === 'reject'
                                        ? 'Reason for rejection (required)'
                                        : d.decision === 'stock_out'
                                          ? 'Note (optional) — e.g. expected restock date'
                                          : short
                                            ? 'Reason for short issue (required)'
                                            : 'Comment (optional)'
                                }
                                className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                        )}
                        {err && (
                            <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                                {err}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full bg-blue-50 p-4 dark:bg-slate-900">
                <PageHeader
                    icon={<BoxesIcon className="h-6 w-6" />}
                    title="Department Requests"
                    subtitle="Manage department requests and issue stock from bulk store"
                />

                <div className="mt-4">
                    <ReusableTable
                        columns={columns}
                        data={issues ?? []}
                        actions={actions}
                        loading={false}
                        title="Department Requests"
                        rowsPerPageOptions={[10, 15, 25, 50, 100]}
                        defaultRowsPerPage={15}
                        defaultOrderBy="requested_at"
                        defaultOrder="desc"
                        filterPlaceholder="Search by department or code..."
                        emptyMessage="No department requests found"
                    />
                </div>

                {/* ---------- RIGHT DRAWER ---------- */}
                <div
                    className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity ${
                        drawerOpen
                            ? 'opacity-100'
                            : 'pointer-events-none opacity-0'
                    }`}
                    onClick={closeDrawer}
                />
                <aside
                    role="dialog"
                    aria-label="Review requisition"
                    className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-xl transform flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-slate-800 ${
                        drawerOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Header */}
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                    <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {selected?.department_name ??
                                            'Department'}
                                    </h3>
                                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                        {selected?.requisition_no}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selected && (
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${priorityClass(selected.priority)}`}
                                    >
                                        {selected.priority}
                                    </span>
                                )}
                                <button
                                    onClick={closeDrawer}
                                    aria-label="Close"
                                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="h-4 w-4 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {selected && (
                            <>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {selected.requested_by || 'N/A'}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Requested{' '}
                                        {new Date(
                                            selected.requested_at,
                                        ).toLocaleDateString()}
                                    </span>
                                    {selected.required_by && (
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                                            Required by{' '}
                                            {new Date(
                                                selected.required_by,
                                            ).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2.5 flex items-center gap-2">
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                                        {num(
                                            selected.fulfilled_total,
                                        ).toLocaleString()}{' '}
                                        of{' '}
                                        {num(
                                            selected.requested_total,
                                        ).toLocaleString()}{' '}
                                        issued
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search */}
                    <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by product or code"
                                value={searchItem}
                                onChange={(e) => setSearchItem(e.target.value)}
                                className="h-7 w-full rounded-md border border-slate-200 pr-3 pl-8 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-3 dark:bg-slate-900/30">
                        {filteredItems.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-500">
                                No products match your search
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map(renderLine)}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                        {openLines.length === 0 ? (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    All lines are closed
                                </span>
                                <button
                                    onClick={closeDrawer}
                                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                    <p>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {summary.accept}
                                        </span>{' '}
                                        to issue (
                                        {summary.units.toLocaleString()} units)
                                    </p>
                                    <p>
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                            {summary.reject}
                                        </span>{' '}
                                        rejected ·{' '}
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                            {summary.stockOut}
                                        </span>{' '}
                                        out of stock
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={closeDrawer}
                                        disabled={submitting}
                                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitDecisions}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {submitting && (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        )}
                                        {submitting
                                            ? 'Processing…'
                                            : 'Confirm decisions'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </AppLayout>
    );
}

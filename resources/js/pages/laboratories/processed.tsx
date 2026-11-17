// resources/js/pages/laboratory/Processed.tsx
import { router, usePage } from '@inertiajs/react';
import {
    Microscope,
    FlaskConical,
    X,
    Receipt,
    FileText,
    CheckCircle2,
    UserCheck,
    CalendarClock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface LabTest {
    item_id?: number;
    test_name: string;
    unit_price: string;
    quantity: number;
    total_price: string;
    amount: number;
    status: string;
    result_value?: string | null;
    reference_range?: string | null;
    unit?: string | null;
    interpretation?: string | null;
    result_file?: string | null;
}

interface ProcessedBy {
    id?: number;
    name?: string | null;
    role?: string | null;
    processed_at?: string | null;
    files_uploaded?: number;
}

interface QueuePatient {
    id: number;
    lab_order_id?: number;
    token: string;
    visit_token?: string;
    first_name: string;
    last_name: string;
    gender: string | null;
    status: string;
    created_at: string;
    patient_number?: string;
    ordered_by?: string;
    total_amount: number;
    tests: LabTest[];
    processed_by?: ProcessedBy | null;
}

interface Props {
    queue: QueuePatient[];
}

// ============ HELPERS ============
const formatMoney = (n: number | string) =>
    `ZMW ${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        active: {
            label: 'In Queue',
            badge: 'bg-blue-50 text-blue-700 border-blue-200',
            dot: 'bg-blue-500',
        },
        pending: {
            label: 'Pending',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
        },
        accepted: {
            label: 'Accepted — Awaiting Payment',
            badge: 'bg-purple-50 text-purple-700 border-purple-200',
            dot: 'bg-purple-500',
        },
        completed: {
            label: 'Completed',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
        },
        cancelled: {
            label: 'Cancelled',
            badge: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
        },
    };
    return map[status] ?? map.completed;
};

// ============ RESULTS DRAWER ============
function ProcessedResultsDrawer({
    order,
    isOpen,
    onClose,
}: {
    order: QueuePatient | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const tests = order?.tests ?? [];
    const overallTotal = useMemo(
        () => tests.reduce((s, t) => s + Number(t.amount ?? 0), 0),
        [tests],
    );

    if (!order) return null;

    const processed = order.processed_by;

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-900/40 transition-opacity',
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                            <CheckCircle2 size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Processed Results
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                {order.token}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Patient strip */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
                        {order.first_name?.[0]}
                        {order.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                            {order.first_name} {order.last_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {order.gender || '—'} · {order.ordered_by || '—'}
                        </p>
                    </div>
                </div>

                {/* Processed-by strip */}
                <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                        <UserCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                            Processed By
                        </p>
                        <p className="truncate text-sm font-medium text-slate-900">
                            {processed?.name || '—'}
                        </p>
                        <p className="flex items-center gap-2 text-[11px] text-slate-500">
                            {processed?.role && (
                                <span className="capitalize">
                                    {processed.role}
                                </span>
                            )}
                            {processed?.processed_at && (
                                <span className="flex items-center gap-1">
                                    <CalendarClock size={11} />
                                    {formatDateTime(processed.processed_at)}
                                </span>
                            )}
                            {typeof processed?.files_uploaded === 'number' && (
                                <span>{processed.files_uploaded} file(s)</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        Test Results ({tests.length})
                    </h3>

                    <ul className="space-y-2">
                        {tests.map((t, idx) => (
                            <li
                                key={`${t.test_name}-${idx}`}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-50 text-[10px] font-semibold text-emerald-600">
                                            {idx + 1}
                                        </span>
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {t.test_name}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                            t.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700',
                                        )}
                                    >
                                        {t.status}
                                    </span>
                                </div>

                                {/* Result grid */}
                                <div className="mt-2 ml-7 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                    <div>
                                        <span className="text-slate-400">
                                            Result
                                        </span>
                                        <p className="font-medium text-slate-800">
                                            {t.value_numeric || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">
                                            Reference
                                        </span>
                                        <p className="text-slate-700">
                                            {t.reference_range || '—'}{' '}
                                            {t.unit ? `(${t.unit})` : ''}
                                        </p>
                                    </div>
                                    {t.interpretation && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">
                                                Interpretation
                                            </span>
                                            <p className="text-slate-700">
                                                {t.interpretation}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* {t.result_file && (
                                    <a
                                        href={t.result_file}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 ml-7 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                    >
                                        <FileText size={11} /> View result PDF
                                    </a>
                                )} */}
                            </li>
                        ))}

                        {tests.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                No results on this order
                            </li>
                        )}
                    </ul>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total</span>
                        <span className="font-mono text-base font-semibold text-blue-600">
                            {formatMoney(overallTotal)}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-3 w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </footer>
            </aside>
        </>
    );
}

// ============ MAIN COMPONENT ============
export default function Processed() {
    const { props } = usePage<Props>();
    const queues = props.queue || [];

    const [selectedOrder, setSelectedOrder] = useState<QueuePatient | null>(
        null,
    );
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openDetails = (row: QueuePatient) => {
        setSelectedOrder(row);
        setDrawerOpen(true);
    };

    const closeDetails = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedOrder(null), 250);
    };

    const columns: Column<QueuePatient>[] = [
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-slate-800">
                    AMH-{value}
                </span>
            ),
        },
        {
            id: 'first_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-[10px] font-semibold text-white">
                        {row.first_name?.[0]}
                        {row.last_name?.[0]}
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {row.first_name} {row.last_name}
                        </p>
                        {row.patient_number && (
                            <p className="font-mono text-[11px] text-slate-400">
                                {row.patient_number}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'gender',
            label: 'Sex/Age',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600 capitalize">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'tests',
            label: 'Tests',
            format: (_, row) => {
                const count = row.tests?.length ?? 0;
                const done =
                    row.tests?.filter((t) => t.status === 'completed').length ??
                    0;
                return (
                    <button
                        onClick={() => openDetails(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                        <FlaskConical size={12} />
                        {done}/{count} done
                    </button>
                );
            },
        },
        {
            id: 'total_amount',
            label: 'Total',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-slate-800">
                    {formatMoney(value)}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                active: 'info',
                pending: 'warning',
                accepted: 'info',
                completed: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusConfig(value);
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            config.badge,
                        )}
                    >
                        <span
                            className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                config.dot,
                            )}
                        />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'ordered_by',
            label: 'Ordered By',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600 capitalize">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'processed_by',
            label: 'Processed By',
            sortable: false,
            format: (_, row) => {
                const p = row.processed_by;
                if (!p?.name) {
                    return <span className="text-xs text-slate-400">—</span>;
                }
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-semibold text-white">
                            {p.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-800">
                                {p.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {formatDateTime(p.processed_at)}
                            </p>
                        </div>
                    </div>
                );
            },
        },
    ];

    const actions: Action<QueuePatient>[] = [
        {
            label: 'Show Results',
            icon: <FileText size={16} />,
            color: 'success',
            onClick: (row) => openDetails(row),
        },
        {
            label: 'View Order',
            icon: <Receipt size={16} />,
            color: 'info',
            onClick: (row) => openDetails(row),
        },
    ];

    const statusOptions = [
        { value: 'completed', label: 'Completed' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Laboratory' },
                { href: '', title: 'Processed' },
            ]}
        >
            <PageHeader
                icon={<Microscope className="h-5 w-5" />}
                title="Processed Laboratory Results"
                subtitle="Review completed tests, result values, and who processed each sample"
            />
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <ReusableTable
                    title="Processed Results"
                    columns={columns}
                    data={queues}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by name or token..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="created_at"
                    defaultOrderDirection="desc"
                    emptyMessage="No processed results yet"
                    className="shadow-sm"
                />
            </div>

            <ProcessedResultsDrawer
                order={selectedOrder}
                isOpen={drawerOpen}
                onClose={closeDetails}
            />
        </AppLayout>
    );
}

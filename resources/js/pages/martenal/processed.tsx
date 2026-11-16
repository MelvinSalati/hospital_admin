// resources/js/pages/radiologies/processed.tsx
import { usePage } from '@inertiajs/react';
import {
    Microscope,
    X,
    Receipt,
    FileText,
    CheckCircle2,
    CalendarClock,
    UserCheck,
    ScanLine,
    Image as ImageIcon,
    ExternalLink,
    AlertTriangle,
    Download,
    Eye,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============ TYPES (match mapProcessedRow) ============
interface ImagingFile {
    id: number;
    name: string;
    url: string | null;
    mime: string | null;
    size: number | null;
    type: 'image' | 'dicom' | 'pdf' | 'report' | 'other';
    uploaded_at: string | null;
}

interface ImagingProcessedRow {
    id: number;
    order_number: string;
    visit_token: string;
    status: string;
    patient_id: number | null;
    patient_name: string;
    modality: string | null;
    body_part: string | null;
    performed_by: number | null;
    performed_at: string | null;
    reported_by: number | null;
    reported_at: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    amended_at: string | null;
    findings: string | null;
    impression: string | null;
    recommendations: string | null;
    files: ImagingFile[];
    removed_files?: any[];
}

interface Props {
    radiologyQueue: ImagingProcessedRow[];
}

// ============ HELPERS ============
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

const initials = (name?: string | null) => {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        pending: {
            label: 'Pending',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
        },
        scheduled: {
            label: 'Scheduled',
            badge: 'bg-blue-50 text-blue-700 border-blue-200',
            dot: 'bg-blue-500',
        },
        in_progress: {
            label: 'In Progress',
            badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            dot: 'bg-indigo-500',
        },
        performed: {
            label: 'Performed',
            badge: 'bg-sky-50 text-sky-700 border-sky-200',
            dot: 'bg-sky-500',
        },
        reported: {
            label: 'Reported',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
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

const fileTypeIcon = (type: ImagingFile['type']) => {
    if (type === 'image') return <ImageIcon size={16} />;
    if (type === 'dicom') return <ScanLine size={16} />;
    return <FileText size={16} />;
};

/**
 * Detects whether a file URL is actually a raster image we can render with
 * <img>. Falls back to `type` on the payload, then to the extension.
 */
const isPreviewableImage = (file: ImagingFile): boolean => {
    if (file.type === 'image') return true;
    const mime = file.mime?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
};

const isPdf = (file: ImagingFile): boolean => {
    if (file.type === 'pdf') return true;
    return file.mime?.toLowerCase() === 'application/pdf';
};

// ============ DRAWER ============
function ProcessedResultsDrawer({
    order,
    isOpen,
    onClose,
}: {
    order: ImagingProcessedRow | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

    // Reset selection when drawer closes
    useEffect(() => {
        if (!isOpen) setSelectedFileId(null);
    }, [isOpen]);

    // Auto-select the first file whenever the drawer opens on a new order
    useEffect(() => {
        if (isOpen && order) {
            setSelectedFileId((prev) => prev ?? order.files?.[0]?.id ?? null);
        }
    }, [isOpen, order?.id]);

    if (!order) return null;

    const files = order.files ?? [];
    const cfg = getStatusConfig(order.status);
    const selectedFile =
        files.find((f) => f.id === selectedFileId) ?? files[0] ?? null;

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
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                            <CheckCircle2 size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Processed Imaging Results
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                {order.order_number} · {order.visit_token}
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-600 text-xs font-semibold text-white">
                        {initials(order.patient_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                            {order.patient_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {order.modality ?? '—'} · {order.body_part ?? '—'}
                        </p>
                    </div>
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            cfg.badge,
                        )}
                    >
                        <span
                            className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)}
                        />
                        {cfg.label}
                    </span>
                </div>

                {/* Timeline strip */}
                <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                        <UserCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                            Timeline
                        </p>
                        <p className="flex items-center gap-2 text-[11px] text-slate-600">
                            <CalendarClock size={11} />
                            <span className="font-medium">Performed:</span>{' '}
                            {formatDateTime(order.performed_at)}
                        </p>
                        {order.reported_at && (
                            <p className="flex items-center gap-2 text-[11px] text-slate-600">
                                <CalendarClock size={11} />
                                <span className="font-medium">
                                    Reported:
                                </span>{' '}
                                {formatDateTime(order.reported_at)}
                            </p>
                        )}
                        {order.reviewed_at && (
                            <p className="flex items-center gap-2 text-[11px] text-slate-600">
                                <CalendarClock size={11} />
                                <span className="font-medium">
                                    Reviewed:
                                </span>{' '}
                                {formatDateTime(order.reviewed_at)}
                            </p>
                        )}
                        {order.amended_at && (
                            <p className="flex items-center gap-2 text-[11px] text-amber-600">
                                <AlertTriangle size={11} />
                                <span className="font-medium">
                                    Amended:
                                </span>{' '}
                                {formatDateTime(order.amended_at)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {/* Preview panel */}
                    {selectedFile && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            {!selectedFile.url ? (
                                <p className="py-10 text-center text-xs text-slate-400">
                                    File unavailable
                                </p>
                            ) : isPreviewableImage(selectedFile) ? (
                                <img
                                    src={selectedFile.url}
                                    alt={selectedFile.name}
                                    className="mx-auto max-h-[420px] w-auto rounded object-contain"
                                    onError={(e) => {
                                        // Graceful fallback if the URL 404s or is blocked
                                        (
                                            e.currentTarget as HTMLImageElement
                                        ).style.display = 'none';
                                        const sibling = (
                                            e.currentTarget as HTMLImageElement
                                        )
                                            .nextElementSibling as HTMLElement | null;
                                        if (sibling)
                                            sibling.style.display = 'flex';
                                    }}
                                />
                            ) : isPdf(selectedFile) ? (
                                <iframe
                                    src={selectedFile.url}
                                    title={selectedFile.name}
                                    className="h-[420px] w-full rounded border border-slate-200 bg-white"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-10 text-center">
                                    <ScanLine
                                        size={32}
                                        className="text-slate-400"
                                    />
                                    <p className="text-sm font-medium text-slate-700">
                                        {selectedFile.type.toUpperCase()} file
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Cannot be previewed in the browser.
                                    </p>
                                    <a
                                        href={selectedFile.url}
                                        download={selectedFile.name}
                                        className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                    >
                                        <Download size={12} /> Download
                                    </a>
                                </div>
                            )}

                            <p className="mt-2 truncate text-center text-[11px] text-slate-500">
                                {selectedFile.name}
                            </p>
                        </div>
                    )}

                    {/* Files list */}
                    <section>
                        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Files ({files.length})
                        </h3>
                        <ul className="space-y-2">
                            {files.map((f) => {
                                const active = selectedFile?.id === f.id;
                                return (
                                    <li key={f.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedFileId(f.id)
                                            }
                                            className={cn(
                                                'flex w-full items-center gap-3 rounded-lg border bg-white p-2.5 text-left transition',
                                                active
                                                    ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-200'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                                            )}
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                                                {fileTypeIcon(f.type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {f.name}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {f.type} ·{' '}
                                                    {f.size
                                                        ? `${(f.size / 1024).toFixed(0)} KB`
                                                        : '—'}
                                                    {f.uploaded_at && (
                                                        <>
                                                            {' · '}
                                                            {formatDateTime(
                                                                f.uploaded_at,
                                                            )}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            {f.url && (
                                                <a
                                                    href={f.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                    title="Open in new tab"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                            {files.length === 0 && (
                                <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                    No files uploaded
                                </li>
                            )}
                        </ul>
                    </section>

                    {/* Findings */}
                    <section>
                        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Findings
                        </h3>
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap text-slate-700">
                            {order.findings || '—'}
                        </div>
                    </section>

                    {/* Impression */}
                    <section>
                        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Impression
                        </h3>
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap text-slate-700">
                            {order.impression || '—'}
                        </div>
                    </section>

                    {/* Recommendations */}
                    {order.recommendations && (
                        <section>
                            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                Recommendations
                            </h3>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap text-slate-700">
                                {order.recommendations}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <footer className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </footer>
            </aside>
        </>
    );
}

// ============ MAIN ============
export default function Processed() {
    const { props } = usePage<Props>();
    const rows = props.radiologyQueue || [];
    console.log(rows);
    const [selectedOrder, setSelectedOrder] =
        useState<ImagingProcessedRow | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openDetails = (row: ImagingProcessedRow) => {
        setSelectedOrder(row);
        setDrawerOpen(true);
    };

    const closeDetails = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedOrder(null), 250);
    };

    const columns: Column<ImagingProcessedRow>[] = [
        {
            id: 'order_number',
            label: 'Order',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-slate-800">
                    {value}
                </span>
            ),
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600 text-[10px] font-semibold text-white">
                        {initials(row.patient_name)}
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {row.patient_name}
                        </p>
                        {row.visit_token && (
                            <p className="font-mono text-[11px] text-slate-400">
                                {row.visit_token}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'modality',
            label: 'Modality',
            sortable: true,
            format: (value) => (
                <span className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                    {value ?? '—'}
                </span>
            ),
        },
        {
            id: 'body_part',
            label: 'Body Part',
            format: (value) => (
                <span className="text-xs text-slate-600">{value ?? '—'}</span>
            ),
        },
        {
            id: 'files',
            label: 'Files',
            format: (_, row) => {
                const n = row.files?.length ?? 0;
                return (
                    <button
                        onClick={() => openDetails(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                        <Eye size={12} />
                        {n} file{n === 1 ? '' : 's'}
                    </button>
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
                pending: 'warning',
                scheduled: 'info',
                in_progress: 'info',
                performed: 'info',
                reported: 'success',
                completed: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const cfg = getStatusConfig(value);
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
        {
            id: 'performed_at',
            label: 'Performed',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600">
                    {formatDateTime(value)}
                </span>
            ),
        },
        {
            id: 'reported_at',
            label: 'Reported',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600">
                    {formatDateTime(value)}
                </span>
            ),
        },
    ];

    const actions: Action<ImagingProcessedRow>[] = [
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
        { value: 'in_progress', label: 'In Progress' },
        { value: 'performed', label: 'Performed' },
        { value: 'reported', label: 'Reported' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Radiology' },
                { href: '', title: 'Processed' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <PageHeader
                    icon={<Microscope className="h-5 w-5" />}
                    title="Attendance"
                    subtitle="Clients seen In MCH"
                />

                <ReusableTable
                    title="Attendance In MCH"
                    columns={columns}
                    data={rows}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by name, order number, or token..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="reported_at"
                    defaultOrderDirection="desc"
                    emptyMessage="No processed imaging results yet"
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

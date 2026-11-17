// pages/patients/Laboratory.tsx - Refactored with two-column layout + flat/nested data compatibility
import { usePage, router } from '@inertiajs/react';
import {
    AlertCircle,
    Plus,
    X,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ShoppingCart,
    Search,
    FileText,
    Calendar,
    User,
    Clock,
    FlaskConical,
    Microscope,
    Beaker,
    TestTube,
    Pill,
    Activity,
    Filter,
    AlertTriangle,
    History,
    Ban,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { Column } from './components/Table';
import { Table, StatusBadge } from './components/Table';
import PageHeader from '@/components/PageHeader';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface LabOrderItem {
    id: string | number;
    order_number: string;
    test_id: number;
    test_name: string;
    test_category?: string;
    status: 'ordered' | 'pending' | 'completed' | 'cancelled' | 'rejected';
    priority?: string;
    result_value?: string | null;
    reference_range?: string | null;
    interpretation?: string | null;
    unit?: string | null;
    notes?: string | null;
    performed_by?: string | null;
    performed_date?: string | null;
    created_at: string;
    updated_at?: string;
    patient_id?: number | null;
    lab_order_id?: number;
    created_by?: number | null;
    deleted_at?: string | null;
    /** Public URL to the uploaded result PDF / image (from lab_result_files) */
    result_file?: string | null;
    result_file_name?: string | null;
}

interface LabOrder {
    id: string | number;
    order_number: string;
    visit_token?: string;
    patient_id?: number;
    status: 'pending' | 'completed' | 'cancelled' | 'rejected' | 'ordered';
    created_at: string;
    updated_at?: string;
    item: LabOrderItem[];
    priority?: string;
}

interface LaboratoryProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
    }>;
    previousOrders: LabOrder[] | null;
    error?: string;
}

// ─── Utility Functions ─────────────────────────────────────────────────────────
const getPriceAsNumber = (
    price: string | number | undefined | null,
): number => {
    if (price === undefined || price === null) return 0;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof price === 'number') {
        return isNaN(price) ? 0 : price;
    }
    return 0;
};

const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toFixed(2)}`;
};

const formatDate = (date: string) => {
    if (!date) return '—';
    try {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'rejected':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'ordered':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        default:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle className="h-3.5 w-3.5" />;
        case 'cancelled':
            return <X className="h-3.5 w-3.5" />;
        case 'rejected':
            return <Ban className="h-3.5 w-3.5" />;
        case 'ordered':
            return <FileText className="h-3.5 w-3.5" />;
        default:
            return <Clock className="h-3.5 w-3.5" />;
    }
};

// ─── Date Filter Labels ──────────────────────────────────────────────────────
const DATE_FILTER_LABELS: Record<string, string> = {
    all: 'All Time',
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    '3months': 'Last 3 Months',
};

// ─── Order Details Modal ──────────────────────────────────────────────────────
const OrderDetailsModal = ({
    isOpen,
    onClose,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: LabOrder | null;
}) => {
    if (!isOpen || !order) return null;

    const items = order.item || [];

    const completedCount = items.filter((i) => i.status === 'completed').length;
    const pendingCount = items.filter(
        (i) => i.status === 'pending' || i.status === 'ordered',
    ).length;
    const rejectedCount = items.filter(
        (i) => i.status === 'rejected' || i.status === 'cancelled',
    ).length;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                    {/* ── Header (fixed, non-scrollable) ───────────────────── */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                        Order Details
                                    </h2>
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-blue-700 uppercase ring-1 ring-blue-200">
                                        {items.length} Test
                                        {items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <p className="mt-0.5 font-mono text-xs text-slate-500">
                                    {order.order_number}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* ── Body (scrollable) ───────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/40">
                        <div className="space-y-6 px-6 py-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                    <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                        Status
                                    </p>
                                    <div className="mt-2">
                                        <Badge
                                            className={`flex w-fit items-center gap-1.5 px-2.5 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}
                                        >
                                            {getStatusIcon(order.status)}
                                            <span>{order.status}</span>
                                        </Badge>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                    <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                        Date
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-800">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                    <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                        Visit Token
                                    </p>
                                    <p className="mt-2 truncate font-mono text-sm font-semibold text-slate-800">
                                        {order.visit_token || '—'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                    <p className="text-[11px] font-semibold tracking-wider text-blue-500 uppercase">
                                        Total Tests
                                    </p>
                                    <p className="mt-2 text-2xl leading-none font-bold text-blue-600">
                                        {items.length}
                                    </p>
                                </div>
                            </div>

                            {/* Status Breakdown */}
                            {items.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-slate-500">
                                        Breakdown:
                                    </span>
                                    {completedCount > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                                            <CheckCircle className="h-3 w-3" />
                                            {completedCount} Completed
                                        </span>
                                    )}
                                    {pendingCount > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                            <Clock className="h-3 w-3" />
                                            {pendingCount} Pending
                                        </span>
                                    )}
                                    {rejectedCount > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                                            <Ban className="h-3 w-3" />
                                            {rejectedCount} Rejected
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Test Items Table */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-bold tracking-tight text-slate-800">
                                        Laboratory Tests
                                    </h3>
                                    <span className="text-xs text-slate-400">
                                        {items.length} item
                                        {items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="w-full">
                                        <thead className="border-b border-slate-200 bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Test Order #
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Test Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Category
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Priority
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Result
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="group transition-colors hover:bg-blue-50/40"
                                                >
                                                    <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-600">
                                                        {item.order_number}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 ring-1 ring-blue-100">
                                                                <TestTube className="h-3.5 w-3.5 text-blue-500" />
                                                            </div>
                                                            <span className="font-medium text-slate-800">
                                                                {item.test_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                            {item.test_category ||
                                                                'Laboratory'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={`text-xs font-medium capitalize ${
                                                                item.priority ===
                                                                'urgent'
                                                                    ? 'text-rose-600'
                                                                    : item.priority ===
                                                                        'stat'
                                                                      ? 'text-orange-600'
                                                                      : 'text-slate-600'
                                                            }`}
                                                        >
                                                            {item.priority ||
                                                                'routine'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <Badge
                                                            className={`flex w-fit items-center gap-1.5 px-2.5 py-1 text-xs font-medium capitalize ${getStatusColor(item.status)}`}
                                                        >
                                                            {getStatusIcon(
                                                                item.status,
                                                            )}
                                                            <span>
                                                                {item.status}
                                                            </span>
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {item.result_value ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                                {
                                                                    item.result_value
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-4 py-16 text-center"
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                                <FlaskConical className="h-6 w-6 text-slate-400" />
                                                            </div>
                                                            <p className="text-sm font-medium text-slate-500">
                                                                No tests in this
                                                                order
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer (fixed, non-scrollable) ──────────────────── */}
                    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
                        <p className="hidden text-xs text-slate-500 sm:block">
                            Showing{' '}
                            <span className="font-semibold text-slate-700">
                                {items.length}
                            </span>{' '}
                            test{items.length !== 1 ? 's' : ''} for this order
                        </p>

                        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Result File Viewer (PDF / Image) ───────────────────────────────────────
const ResultFileViewer = ({
    open,
    onClose,
    url,
    title,
}: {
    open: boolean;
    onClose: () => void;
    url: string | null;
    title?: string | null;
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setError(false);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        // Prevent background scroll while open
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose, url]);

    if (!open || !url) return null;

    const lower = url.toLowerCase();
    const isPdf =
        lower.endsWith('.pdf') ||
        lower.includes('application/pdf') ||
        lower.includes('/lab-results/');
    const isImage = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(url);

    const handleLoad = () => setLoading(false);
    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-sm sm:p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Lab result report'}
        >
            <div
                className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-slate-700">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                            <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {title || 'Lab Result Report'}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                                {isPdf
                                    ? 'PDF Report'
                                    : isImage
                                      ? 'Image'
                                      : 'Document'}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <a
                            href={url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Download
                        </a>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Open in new tab
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Close viewer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
                    {loading && !error && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 dark:bg-slate-950/90">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            <p className="text-sm text-slate-500">
                                Loading report…
                            </p>
                        </div>
                    )}

                    {error ? (
                        <div className="p-8 text-center">
                            <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Could not load the report preview
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                The file may be unavailable or blocked by the
                                browser.
                            </p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Open in new tab
                            </a>
                        </div>
                    ) : isPdf ? (
                        <iframe
                            key={url}
                            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
                            title={title || 'Lab Result PDF'}
                            className="h-full w-full border-0"
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    ) : isImage ? (
                        <img
                            key={url}
                            src={url}
                            alt={title || 'Lab result'}
                            className="max-h-full max-w-full object-contain p-4"
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    ) : (
                        <div className="p-8 text-center">
                            <FileText className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                Preview not available for this file type.
                            </p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Download / Open
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Order Results Drawer ───────────────────────────────────────────────────
const OrderResultsDrawer = ({
    isOpen,
    onClose,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: LabOrder | null;
}) => {
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState<string | null>(null);

    if (!isOpen || !order) return null;

    const items = order.item || [];
    const completedItems = items.filter(
        (i) => i.status === 'completed' && (i.result_value || i.result_file),
    );
    const pendingItems = items.filter(
        (i) => i.status === 'pending' || i.status === 'ordered',
    );
    const rejectedItems = items.filter(
        (i) => i.status === 'rejected' || i.status === 'cancelled',
    );

    const getPriorityStyle = (priority?: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-rose-50 text-rose-700 ring-rose-200';
            case 'stat':
                return 'bg-orange-50 text-orange-700 ring-orange-200';
            default:
                return 'bg-slate-50 text-slate-600 ring-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
                <div className="flex h-full w-full flex-col bg-white shadow-2xl ring-1 ring-slate-200">
                    {/* Header */}
                    <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                                    <FlaskConical className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-slate-900">
                                        Test Results
                                    </h2>
                                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                                        {order.order_number}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close drawer"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Stat chips */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                <Calendar className="h-3 w-3" />
                                {formatDate(order.created_at)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                <CheckCircle className="h-3 w-3" />
                                {completedItems.length} Ready
                            </span>
                            {pendingItems.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                    <Clock className="h-3 w-3 animate-pulse" />
                                    {pendingItems.length} Pending
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/50">
                        <div className="space-y-5 p-5">
                            {/* Completed Results */}
                            {completedItems.length > 0 && (
                                <div>
                                    <div className="mb-2.5 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                            Available Results
                                        </h3>
                                        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                            {completedItems.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {completedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 ring-1 ring-blue-100">
                                                                <TestTube className="h-3.5 w-3.5 text-blue-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                                    {
                                                                        item.test_name
                                                                    }
                                                                </p>
                                                                <p className="truncate font-mono text-[10px] text-slate-400">
                                                                    {
                                                                        item.order_number
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Result value display */}
                                                        {(item.result_value ||
                                                            item.result_file) && (
                                                            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                                                <p className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
                                                                    Result
                                                                </p>
                                                                {item.result_value ? (
                                                                    <p className="mt-0.5 text-lg font-bold text-slate-800">
                                                                        {
                                                                            item.result_value
                                                                        }
                                                                        {item.unit && (
                                                                            <span className="ml-1 text-xs font-medium text-slate-500">
                                                                                {
                                                                                    item.unit
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                ) : (
                                                                    <p className="mt-0.5 text-sm text-slate-600">
                                                                        Full
                                                                        report
                                                                        available
                                                                        as PDF
                                                                    </p>
                                                                )}
                                                                {item.reference_range && (
                                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                                        Reference:{' '}
                                                                        <span className="font-medium text-slate-700">
                                                                            {
                                                                                item.reference_range
                                                                            }
                                                                        </span>
                                                                    </p>
                                                                )}
                                                                {item.result_file && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setViewerUrl(
                                                                                item.result_file!,
                                                                            );
                                                                            setViewerTitle(
                                                                                item.result_file_name ||
                                                                                    item.test_name,
                                                                            );
                                                                        }}
                                                                        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                                                                    >
                                                                        <FileText className="h-3 w-3" />
                                                                        View
                                                                        Report
                                                                        PDF
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Meta info */}
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                            {item.performed_by && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <User className="h-3 w-3" />
                                                                    {
                                                                        item.performed_by
                                                                    }
                                                                </span>
                                                            )}
                                                            {item.performed_date && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {formatDate(
                                                                        item.performed_date,
                                                                    )}
                                                                </span>
                                                            )}
                                                            {item.interpretation && (
                                                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700 ring-1 ring-blue-100">
                                                                    {
                                                                        item.interpretation
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ring-1 ${getPriorityStyle(item.priority)}`}
                                                    >
                                                        {item.priority ||
                                                            'routine'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pending Items */}
                            {pendingItems.length > 0 && (
                                <div>
                                    <div className="mb-2.5 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                            Awaiting Results
                                        </h3>
                                        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                            {pendingItems.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {pendingItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 ring-1 ring-amber-100">
                                                                <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                                    {
                                                                        item.test_name
                                                                    }
                                                                </p>
                                                                <p className="truncate font-mono text-[10px] text-slate-400">
                                                                    {
                                                                        item.order_number
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                                                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                            <div>
                                                                <p className="text-xs font-semibold text-amber-800">
                                                                    Pending
                                                                    Result
                                                                </p>
                                                                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                                                                    Results for
                                                                    this test
                                                                    are
                                                                    currently
                                                                    being
                                                                    processed.
                                                                    Please check
                                                                    back later
                                                                    or contact
                                                                    the
                                                                    laboratory
                                                                    for updates.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                Ordered{' '}
                                                                {formatDate(
                                                                    order.created_at,
                                                                )}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 ring-1 ring-amber-100">
                                                                <Activity className="h-3 w-3" />
                                                                In Progress
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ring-1 ${getPriorityStyle(item.priority)}`}
                                                    >
                                                        {item.priority ||
                                                            'routine'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rejected / Cancelled */}
                            {rejectedItems.length > 0 && (
                                <div>
                                    <div className="mb-2.5 flex items-center gap-2">
                                        <Ban className="h-4 w-4 text-rose-600" />
                                        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                            Rejected / Cancelled
                                        </h3>
                                        <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                            {rejectedItems.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {rejectedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 ring-1 ring-rose-100">
                                                        <Ban className="h-3.5 w-3.5 text-rose-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            {item.test_name}
                                                        </p>
                                                        <p className="text-[11px] text-rose-600 capitalize">
                                                            {item.status}
                                                        </p>
                                                    </div>
                                                </div>
                                                {item.notes && (
                                                    <p className="mt-2 text-[11px] text-slate-500">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty state */}
                            {items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                        <FlaskConical className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-slate-500">
                                        No tests in this order
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                    {items.length}
                                </span>{' '}
                                test{items.length !== 1 ? 's' : ''} in this
                                order
                            </p>
                            <Button
                                onClick={onClose}
                                className="bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ResultFileViewer
                open={!!viewerUrl}
                onClose={() => {
                    setViewerUrl(null);
                    setViewerTitle(null);
                }}
                url={viewerUrl}
                title={viewerTitle}
            />
        </div>
    );
};

// ─── Previous Results Component ─────────────────────────────────────────────
interface PreviousResult {
    id: string | number;
    order_number: string;
    service_name: string;
    result_value: string;
    performed_by?: string;
    result_date: string;
    status: 'completed' | 'rejected';
}

const PreviousResultsTable = ({ orders }: { orders: LabOrder[] }) => {
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState<string | null>(null);

    // Flatten all items across orders for the previous results view
    const allItems = orders.flatMap((order) =>
        (order.item || []).map((item) => ({
            ...item,
            _parentOrderNumber: order.order_number,
            _parentCreatedAt: order.created_at,
        })),
    );

    // Completed = has structured result OR an attached result file (PDF)
    const completedOrders = allItems.filter(
        (item) =>
            item.status === 'completed' &&
            (item.result_value || item.result_file),
    );

    // Filter rejected orders
    const rejectedOrders = allItems.filter(
        (item) => item.status === 'rejected',
    );

    // Pending orders
    const pendingOrders = allItems.filter(
        (item) => item.status === 'pending' || item.status === 'ordered',
    );

    return (
        <div className="space-y-4">
            {/* Completed Results */}
            <div className="rounded-lg border border-green-200 bg-green-50/50">
                <div className="flex items-center gap-2 border-b border-green-200 px-4 py-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-800">
                        Completed Results
                    </h4>
                    <Badge className="ml-auto bg-green-200 text-green-800">
                        {completedOrders.length}
                    </Badge>
                </div>
                <div className="p-3">
                    {completedOrders.length > 0 ? (
                        <div className="space-y-2">
                            {completedOrders.slice(0, 8).map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-green-50"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {item.test_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        item.performed_date ||
                                                            item._parentCreatedAt,
                                                    )}
                                                </span>
                                                {item.performed_by && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {item.performed_by}
                                                    </span>
                                                )}
                                            </div>
                                            {item.result_value && (
                                                <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                                                    {item.result_value}
                                                    {item.unit ? (
                                                        <span className="ml-1 font-normal text-slate-500">
                                                            {item.unit}
                                                        </span>
                                                    ) : null}
                                                </p>
                                            )}
                                        </div>
                                        <div className="ml-2 flex shrink-0 flex-col items-end gap-1.5">
                                            <Badge className="bg-green-100 text-green-800">
                                                Completed
                                            </Badge>
                                            {item.result_file && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setViewerUrl(
                                                            item.result_file!,
                                                        );
                                                        setViewerTitle(
                                                            item.result_file_name ||
                                                                item.test_name,
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    View Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {completedOrders.length > 8 && (
                                <p className="text-center text-xs text-gray-400">
                                    +{completedOrders.length - 8} more results
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="py-4 text-center text-sm text-gray-400">
                            No completed results available
                        </p>
                    )}
                </div>
            </div>

            {/* Rejected & Pending Results */}
            <div className="rounded-lg border border-red-200 bg-red-50/50">
                <div className="flex items-center gap-2 border-b border-red-200 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-800">
                        Rejected & Pending
                    </h4>
                    <Badge className="ml-auto bg-red-200 text-red-800">
                        {rejectedOrders.length + pendingOrders.length}
                    </Badge>
                </div>
                <div className="p-3">
                    {rejectedOrders.length > 0 || pendingOrders.length > 0 ? (
                        <div className="space-y-2">
                            {/* Rejected Orders */}
                            {rejectedOrders.slice(0, 3).map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-red-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {item.test_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        item._parentCreatedAt,
                                                    )}
                                                </span>
                                                {item.notes && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <Ban className="h-3 w-3" />
                                                        {item.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className="bg-red-100 text-red-800">
                                            Rejected
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {/* Pending Orders */}
                            {pendingOrders.slice(0, 3).map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-yellow-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {item.test_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        item._parentCreatedAt,
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1 text-yellow-600">
                                                    <Clock className="h-3 w-3" />
                                                    Waiting for results
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className="bg-yellow-100 text-yellow-800">
                                            Pending
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {(rejectedOrders.length > 3 ||
                                pendingOrders.length > 3) && (
                                <p className="text-center text-xs text-gray-400">
                                    +
                                    {Math.max(0, rejectedOrders.length - 3) +
                                        Math.max(
                                            0,
                                            pendingOrders.length - 3,
                                        )}{' '}
                                    more items
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="py-4 text-center text-sm text-gray-400">
                            No rejected or pending results
                        </p>
                    )}
                </div>
            </div>

            <ResultFileViewer
                open={!!viewerUrl}
                onClose={() => {
                    setViewerUrl(null);
                    setViewerTitle(null);
                }}
                url={viewerUrl}
                title={viewerTitle}
            />
        </div>
    );
};

// ─── LabOrderTable Component ──────────────────────────────────────────────
interface LabOrderTableProps {
    orders: LabOrder[];
    isLabTechnician?: boolean;
    onEnterResults?: (order: LabOrderItem) => void;
    onViewDetails?: (order: LabOrder) => void;
    onExport?: () => void;
    itemsPerPage?: number;
}

const LabOrderTable = ({
    orders,
    isLabTechnician = false,
    onEnterResults,
    onViewDetails,
    onExport,
    itemsPerPage = 5,
}: LabOrderTableProps) => {
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Drawer state
    const [selectedResultsOrder, setSelectedResultsOrder] =
        useState<LabOrder | null>(null);
    const [isResultsDrawerOpen, setIsResultsDrawerOpen] = useState(false);

    // Filter orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const items = order.item || [];

            const matchesSearch =
                searchTerm === '' ||
                order.order_number
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                items.some((it) =>
                    it.test_name
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()),
                );

            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;

            let matchesDate = true;
            if (dateFilter !== 'all') {
                const orderDate = new Date(order.created_at);
                const today = new Date();
                const todayStart = new Date(today.setHours(0, 0, 0, 0));

                switch (dateFilter) {
                    case 'today':
                        matchesDate = orderDate >= todayStart;
                        break;
                    case 'week': {
                        const weekAgo = new Date(todayStart);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        matchesDate = orderDate >= weekAgo;
                        break;
                    }
                    case 'month': {
                        const monthAgo = new Date(todayStart);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        matchesDate = orderDate >= monthAgo;
                        break;
                    }
                    case '3months': {
                        const threeMonthsAgo = new Date(todayStart);
                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                        matchesDate = orderDate >= threeMonthsAgo;
                        break;
                    }
                    default:
                        matchesDate = true;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, dateFilter]);

    // Calculate total pages
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    const handleFilterChange = (setter: any, value: any) => {
        setter(value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDateFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        searchTerm || statusFilter !== 'all' || dateFilter !== 'all';

    // Handle row click to show details
    const handleRowClick = (order: LabOrder) => {
        setSelectedOrder(order);
        setIsDetailsModalOpen(true);
        if (onViewDetails) {
            onViewDetails(order);
        }
    };

    // Handle view results (drawer)
    const handleViewResults = (order: LabOrder) => {
        setSelectedResultsOrder(order);
        setIsResultsDrawerOpen(true);
    };

    // Define columns for the Table component — NO pricing, NO standalone test name
    const columns: Column<LabOrder>[] = [
        {
            key: 'visit_token',
            header: 'Token',
            render: (value) => (
                <span className="font-mono text-sm font-medium text-gray-700">
                    {value}
                </span>
            ),
            sortable: true,
            className: 'font-mono',
        },
        {
            key: 'item',
            header: 'Tests',
            render: (_value, row) => {
                const items = row.item || [];
                const preview = items
                    .slice(0, 2)
                    .map((it) => it.test_name)
                    .join(', ');
                return (
                    <div className="flex items-center gap-2">
                        <Microscope className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-gray-700">
                            {items.length} test
                            {items.length !== 1 ? 's' : ''}
                        </span>
                        {preview && (
                            <span className="hidden truncate text-xs text-gray-400 sm:inline">
                                • {preview}
                                {items.length > 2
                                    ? ` +${items.length - 2}`
                                    : ''}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge
                    className={`flex w-fit items-center gap-1.5 ${getStatusColor(value)}`}
                >
                    {getStatusIcon(value)}
                    <span className="text-xs capitalize">{value}</span>
                </Badge>
            ),
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (value) => (
                <span className="text-sm text-gray-500">
                    {formatDate(value)}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'id' as any,
            header: '',
            render: (_value, row) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleViewResults(row);
                    }}
                    className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                >
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    Results
                </Button>
            ),
            className: 'text-right',
        },
    ];

    // Add action column for lab technicians
    const renderActions = (row: LabOrder) => {
        if (!isLabTechnician) return null;
        const items = row.item || [];
        const pendingItems = items.filter(
            (it) => it.status === 'ordered' || it.status === 'pending',
        );

        return (
            <div className="flex items-center justify-end gap-2">
                {pendingItems.length > 0 && onEnterResults && (
                    <Button
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEnterResults(pendingItems[0]);
                        }}
                        className="border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                        <Activity className="mr-1 h-3.5 w-3.5" />
                        Enter Results
                    </Button>
                )}
                {items.length > 0 &&
                    items.every((it) => it.status === 'completed') && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Ready
                        </span>
                    )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by order # or test name..."
                        value={searchTerm}
                        onChange={(e) =>
                            handleFilterChange(setSearchTerm, e.target.value)
                        }
                        className="h-10 pr-4 pl-9 text-sm focus:border-blue-400 focus:ring-blue-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            handleFilterChange(setStatusFilter, value)
                        }
                    >
                        <SelectTrigger className="h-10 w-[140px] border-gray-200 text-sm">
                            <Filter className="mr-2 h-3.5 w-3.5 text-gray-400" />
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={dateFilter}
                        onValueChange={(value) =>
                            handleFilterChange(setDateFilter, value)
                        }
                    >
                        <SelectTrigger className="h-10 w-[130px] border-gray-200 text-sm">
                            <Calendar className="mr-2 h-3.5 w-3.5 text-gray-400" />
                            <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                            <SelectItem value="month">Last 30 Days</SelectItem>
                            <SelectItem value="3months">
                                Last 3 Months
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-10 text-sm text-gray-500 hover:text-gray-700"
                        >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Clear
                        </Button>
                    )}

                    {onExport && filteredOrders.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            className="h-10"
                        >
                            Export
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Chips */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-xs font-medium text-gray-500">
                        Active filters:
                    </span>
                    {searchTerm && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Search: {searchTerm}
                            <button
                                onClick={() => setSearchTerm('')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {statusFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Status: {statusFilter}
                            <button
                                onClick={() => setStatusFilter('all')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {dateFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Date: {DATE_FILTER_LABELS[dateFilter]}
                            <button
                                onClick={() => setDateFilter('all')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* Table Component */}
            <Table
                data={paginatedOrders}
                columns={columns}
                subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} found`}
                emptyMessage={
                    hasActiveFilters
                        ? 'No orders match your filters'
                        : 'No laboratory orders available'
                }
                onRowClick={handleRowClick}
                actions={isLabTechnician ? renderActions : undefined}
                searchable={false}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: setCurrentPage,
                    totalItems: filteredOrders.length,
                    itemsPerPage,
                }}
                className="border-0 shadow-none"
            />

            {/* Order Details Modal */}
            <OrderDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
            />

            {/* Order Results Drawer */}
            <OrderResultsDrawer
                isOpen={isResultsDrawerOpen}
                onClose={() => {
                    setIsResultsDrawerOpen(false);
                    setSelectedResultsOrder(null);
                }}
                order={selectedResultsOrder}
            />
        </div>
    );
};

// ─── Results Entry Dialog Component ──────────────────────────────────────────
const ResultsEntryDialog = ({
    isOpen,
    onClose,
    onSuccess,
    testOrder,
    patientName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    testOrder: any;
    patientName: string;
}) => {
    const [formData, setFormData] = useState({
        result_value: '',
        remarks: '',
        performed_by: '',
        result_date: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (testOrder) {
            setFormData((prev) => ({
                ...prev,
                result_value: testOrder.result_value || '',
            }));
        }
    }, [testOrder]);

    if (!isOpen || !testOrder) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.result_value) {
            setErrors({ result_value: 'Result is required' });
            return;
        }

        setIsSubmitting(true);

        router.post(`/lab/results/${testOrder.id}`, formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Results saved successfully');
                onSuccess();
                onClose();
            },
            onError: (err) => setErrors(err),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <FlaskConical className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                Enter Lab Results
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 transition-colors hover:bg-gray-100"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 p-6">
                        <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Patient
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <User className="h-3.5 w-3.5 text-gray-400" />
                                        {patientName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Test
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <Microscope className="h-3.5 w-3.5 text-gray-400" />
                                        {testOrder.test_name ||
                                            testOrder.service_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Order #
                                    </p>
                                    <p className="font-mono text-sm font-medium text-gray-800">
                                        {testOrder.order_number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Date
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        {new Date().toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Result Value{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="result_value"
                                value={formData.result_value}
                                onChange={handleChange}
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="Enter test results..."
                            />
                            {errors.result_value && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.result_value}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Performed By
                            </label>
                            <input
                                type="text"
                                name="performed_by"
                                value={formData.performed_by}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Result Date
                            </label>
                            <input
                                type="date"
                                name="result_date"
                                value={formData.result_date}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Results'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Order Modal Component ──────────────────────────────────────────────────
const OrderModal = ({
    isOpen,
    onClose,
    onSave,
    services,
    patientId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: any[], patientId: string) => Promise<void>;
    services: LaboratoryProps['services'];
    patientId: string;
}) => {
    const [cart, setCart] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredServices =
        services?.filter((s) =>
            s.service_name.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || [];

    const addToCart = (service: any) => {
        const price = getPriceAsNumber(service.price);

        const existing = cart.find(
            (item) => item.service_id === service.id || item.id === service.id,
        );

        if (existing) {
            setCart(
                cart.map((item) =>
                    item.service_id === service.id || item.id === service.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                ),
            );
        } else {
            const cartItem = {
                ...service,
                cart_id: Date.now() + Math.random(),
                service_id: service.id,
                quantity: 1,
                price: price,
            };
            setCart([...cart, cartItem]);
        }
        Notiflix.Notify.success(`${service.service_name} added to cart`);
    };

    const removeFromCart = (cartId: number | string) => {
        setCart(cart.filter((item) => item.cart_id !== cartId));
    };

    const updateQuantity = (cartId: number | string, quantity: number) => {
        if (quantity < 1) return;
        setCart(
            cart.map((item) =>
                item.cart_id === cartId ? { ...item, quantity } : item,
            ),
        );
    };

    const totalAmount = cart.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0,
    );

    const handleSubmit = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning('Please add at least one test to order');
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsToSubmit = cart.map((item) => ({
                id: item.service_id || item.id,
                service_name: item.service_name,
                service_category: item.service_category || 'Laboratory',
                price: item.price || 0,
                quantity: item.quantity,
            }));

            await onSave(itemsToSubmit, patientId);
            setCart([]);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel / reset the modal
    const handleCancel = () => {
        if (cart.length > 0 && !confirm('Discard all items and close?')) {
            return;
        }
        setCart([]);
        setSearchTerm('');
        onClose();
    };

    // Category color mapping
    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            Haematology: 'bg-red-100 text-red-700 border-red-200',
            Biochemistry: 'bg-blue-100 text-blue-700 border-blue-200',
            Microbiology: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            Immunology: 'bg-purple-100 text-purple-700 border-purple-200',
            Serology: 'bg-amber-100 text-amber-700 border-amber-200',
            Toxicology: 'bg-rose-100 text-rose-700 border-rose-200',
            Endocrinology: 'bg-cyan-100 text-cyan-700 border-cyan-200',
            Genetics: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            Urinalysis: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            Histopathology: 'bg-pink-100 text-pink-700 border-pink-200',
            Laboratory: 'bg-slate-100 text-slate-700 border-slate-200',
        };
        return colors[category] || colors['Laboratory'];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative w-[1000px] max-w-6xl rounded-xl bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-600 p-2">
                                <Beaker className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-800">
                                    Order Laboratory Tests
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Select tests and add to cart
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded p-1 hover:bg-slate-100"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Body - Two columns */}
                    <div className="flex min-h-[440px] flex-col md:flex-row">
                        {/* Left - Available Tests */}
                        <div className="w-full border-r border-slate-200 p-4 md:w-1/2">
                            <div className="relative mb-3">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search tests..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                />
                                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
                                    {filteredServices.length}
                                </span>
                            </div>

                            <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                                {filteredServices.map((service, index) => {
                                    const price = getPriceAsNumber(
                                        service.price,
                                    );
                                    const category =
                                        service.service_category ||
                                        'Laboratory';
                                    const colorClass =
                                        getCategoryColor(category);

                                    return (
                                        <div
                                            key={service.id || index}
                                            className={`flex items-center justify-between rounded-lg border ${colorClass} px-3 py-2.5 transition-colors hover:opacity-80`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium">
                                                    {service.service_name}
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <span className="hidden text-xs font-semibold">
                                                        {formatCurrency(price)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {category}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    addToCart(service)
                                                }
                                                className={`ml-2 flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors ${colorClass} hover:bg-opacity-80`}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add
                                            </button>
                                        </div>
                                    );
                                })}
                                {filteredServices.length === 0 && (
                                    <div className="py-8 text-center">
                                        <FlaskConical className="mx-auto h-9 w-9 text-slate-300" />
                                        <p className="mt-2 text-sm text-slate-400">
                                            No tests found
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right - Cart */}
                        <div className="w-full bg-slate-50/50 p-4 md:w-1/2">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                                    Tests Ordered
                                    <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                        {cart.length}
                                    </span>
                                </h3>
                                {cart.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Clear all items?')) {
                                                setCart([]);
                                            }
                                        }}
                                        className="text-xs font-medium text-red-500 hover:text-red-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                                {cart.map((item) => {
                                    const itemPrice = item.price || 0;
                                    const total = itemPrice * item.quantity;
                                    const category =
                                        item.service_category || 'Laboratory';
                                    const colorClass =
                                        getCategoryColor(category);

                                    return (
                                        <div
                                            key={item.cart_id}
                                            className={`rounded-lg border ${colorClass} bg-slate-100 px-3 py-2.5`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {item.service_name}
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="hidden font-semibold">
                                                            {formatCurrency(
                                                                itemPrice,
                                                            )}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {item.quantity}×
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeFromCart(
                                                            item.cart_id,
                                                        )
                                                    }
                                                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cart_id,
                                                                item.quantity -
                                                                    1,
                                                            )
                                                        }
                                                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm hover:bg-slate-50"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-7 text-center text-sm font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cart_id,
                                                                item.quantity +
                                                                    1,
                                                            )
                                                        }
                                                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm hover:bg-slate-50"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="hidden text-sm font-semibold text-blue-600">
                                                    {formatCurrency(total)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {cart.length === 0 && (
                                    <div className="py-10 text-center">
                                        <ShoppingCart className="mx-auto h-9 w-9 text-slate-300" />
                                        <p className="mt-2 text-sm text-slate-400">
                                            No tests selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer - below both columns, spans full width */}
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3.5">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="hidden font-medium text-slate-600">
                                Total:
                            </span>
                            <span className="hidden text-xl font-bold text-blue-600">
                                {formatCurrency(totalAmount)}
                            </span>
                            <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {cart.length}{' '}
                                {cart.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || cart.length === 0}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Processing...
                                    </span>
                                ) : (
                                    `Place Order`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Laboratory Component ──────────────────────────────────────────────
export default function Laboratory() {
    const { props } = usePage();
    const { patientId, services, previousOrders, error } =
        props as LaboratoryProps;

    console.log(props);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
    const [selectedTestOrder, setSelectedTestOrder] =
        useState<LabOrderItem | null>(null);

    const userRoles = (props as any).auth?.user?.profile?.roles || [];
    const isLabTechnician = userRoles.includes('lab_technician');

    // ─── FIXED: Normalize incoming data (handles both nested LabOrder[] and flat item[]) ───
    const enhancedOrders: LabOrder[] = useMemo(() => {
        const raw = previousOrders || [];

        // Normalize any path from lab_result_files into a public URL
        const toPublicUrl = (raw: string | null | undefined): string | null => {
            if (!raw) return null;
            if (
                raw.startsWith('http://') ||
                raw.startsWith('https://') ||
                raw.startsWith('/storage/')
            ) {
                return raw;
            }
            return `/storage/${raw.replace(/^\/+/, '')}`;
        };

        // Case 1: Backend already returns nested structure (preferred)
        if (raw.length > 0 && Array.isArray((raw[0] as any).item)) {
            return (raw as LabOrder[]).map((order) => ({
                ...order,
                item: (order.item || []).map((item) => ({
                    ...item,
                    result_file: toPublicUrl(
                        item.result_file || (item as any).path || null,
                    ),
                })),
            }));
        }

        // Case 2: Backend currently returns a flat list of items → group by lab_order_id
        const groups = new Map<string | number, LabOrder>();

        for (const it of raw as any[]) {
            const orderKey =
                it.lab_order_id ?? it.order_number ?? `unknown-${it.id}`;

            if (!groups.has(orderKey)) {
                groups.set(orderKey, {
                    id: it.lab_order_id ?? it.id,
                    order_number: it.order_number ?? `LAB-${orderKey}`,
                    visit_token: it.visit_token,
                    patient_id: it.patient_id,
                    status:
                        it.status === 'completed'
                            ? 'completed'
                            : (it.status ?? 'ordered'),
                    priority: it.priority ?? 'routine',
                    created_at: it.ordered_date || it.created_at,
                    updated_at: it.updated_at,
                    item: [],
                });
            }

            const order = groups.get(orderKey)!;

            order.item.push({
                id: it.id,
                order_number: it.order_number ?? order.order_number,
                test_id: it.test_id,
                test_name: it.test_name,
                test_category: it.test_category,
                status: it.status,
                priority: it.priority ?? 'routine',
                // Map backend field names → frontend expected names
                result_value: it.value ?? it.result_value ?? null,
                reference_range:
                    it.ref_low != null && it.ref_high != null
                        ? `${it.ref_low} - ${it.ref_high}`
                        : (it.reference_range ?? null),
                unit: it.unit ?? null,
                notes: it.notes ?? null,
                performed_by: it.uploaded_by ?? it.performed_by ?? null,
                performed_date:
                    it.processing_completed_at ||
                    it.processing_date ||
                    it.created_at ||
                    null,
                created_at: it.created_at,
                updated_at: it.updated_at,
                patient_id: it.patient_id,
                lab_order_id: it.lab_order_id,
                created_by: it.ordered_by ?? it.created_by ?? null,
                // PDF / image report from lab_result_files
                // DB path example: lab-results/eb127887-10c5-434d-9d36-0cbf183fc6ef.pdf
                // Public URL:      /storage/lab-results/eb127887-10c5-434d-9d36-0cbf183fc6ef.pdf
                result_file: (() => {
                    const raw =
                        typeof it.result_file === 'string'
                            ? it.result_file
                            : it.result_file?.path ||
                              it.path ||
                              it.result_file_url ||
                              null;
                    if (!raw) return null;
                    // Already absolute or /storage/...
                    if (
                        raw.startsWith('http://') ||
                        raw.startsWith('https://') ||
                        raw.startsWith('/storage/')
                    ) {
                        return raw;
                    }
                    // Relative disk path → public URL
                    const cleaned = raw.replace(/^\/+/, '');
                    return `/storage/${cleaned}`;
                })(),
                result_file_name:
                    it.result_file_name ??
                    it.original_name ??
                    it.result_file?.original_name ??
                    null,
            });
        }

        // Improve parent order status based on its children
        return Array.from(groups.values()).map((order) => {
            const items = order.item;
            if (items.length === 0) return order;

            const allCompleted = items.every((i) => i.status === 'completed');
            const anyRejected = items.some(
                (i) => i.status === 'rejected' || i.status === 'cancelled',
            );
            const anyPending = items.some(
                (i) => i.status === 'pending' || i.status === 'ordered',
            );

            let status: LabOrder['status'] = order.status;
            if (allCompleted) status = 'completed';
            else if (anyRejected && !anyPending) status = 'rejected';
            else if (anyPending) status = 'pending';

            return { ...order, status };
        });
    }, [previousOrders]);

    const handleSaveOrder = async (items: any[], identifier: string) => {
        try {
            const response = await Http.post(`${identifier}/lab-orders`, {
                patient_id: identifier,
                created_by: (props as any).auth?.user?.id,
                services: items.map((item) => ({
                    id: item.id,
                    service_name: item.service_name,
                    service_category: item.service_category || 'Laboratory',
                    price: item.price,
                    quantity: item.quantity,
                    notes: null,
                    priority: 'routine',
                })),
            });

            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message ||
                        `${items.length} test(s) ordered successfully`,
                );
                router.reload({ only: ['previousOrders'] });
                return response.data;
            } else {
                Notiflix.Notify.failure(
                    'Something went wrong while saving order!',
                );
                throw new Error('Failed to save order');
            }
        } catch (error: any) {
            console.error('Error saving order:', error);
            Notiflix.Notify.failure(
                error.response?.data?.message ||
                    'Something went wrong while saving order!',
            );
            throw error;
        }
    };

    const handleEnterResults = (order: LabOrderItem) => {
        setSelectedTestOrder(order);
        setIsResultsDialogOpen(true);
    };

    const handleResultsSuccess = () => {
        router.reload();
    };

    const handleExport = () => {
        if (enhancedOrders.length === 0) {
            Notiflix.Notify.warning('No data to export');
            return;
        }

        const headers = [
            'Order #',
            'Test Order #',
            'Test Name',
            'Category',
            'Priority',
            'Status',
            'Result',
            'Date',
        ];

        const rows = enhancedOrders.flatMap((order) =>
            (order.item || []).map((item) => [
                order.order_number,
                item.order_number,
                item.test_name,
                item.test_category || 'Laboratory',
                item.priority || 'routine',
                item.status,
                item.result_value || '',
                new Date(order.created_at).toLocaleDateString(),
            ]),
        );

        const csv = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab_orders_${patientId}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Laboratory', href: '/' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50 p-4">
                {/* Header */}
                <PageHeader
                    icon={<Microscope />}
                    title="Laboratory"
                    subtitle={'Manage laboratory tests and results'}
                    actions={[
                        {
                            label: 'Order Investigation',
                            onClick() {
                                setIsOrderModalOpen(true);
                            },
                        },
                    ]}
                />

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Left Column - 70% (3/4 of 4 columns = 3) */}
                    <div className="lg:col-span-3">
                        {enhancedOrders.length > 0 ? (
                            <div className="rounded-sm bg-white p-4">
                                <LabOrderTable
                                    orders={enhancedOrders}
                                    isLabTechnician={isLabTechnician}
                                    onEnterResults={handleEnterResults}
                                    onExport={handleExport}
                                    itemsPerPage={5}
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                                <FlaskConical className="mx-auto h-16 w-16 text-gray-300" />
                                <h3 className="mt-4 text-lg font-medium text-gray-700">
                                    No test orders found
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Start by ordering your first laboratory test
                                </p>
                                <Button
                                    onClick={() => setIsOrderModalOpen(true)}
                                    className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Order Your First Test
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Column - 30% (1/4 of 4 columns = 1) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-4">
                            {/* Previous Results Section */}
                            <div className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
                                    <History className="h-4 w-4 text-blue-600" />
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        Previous Results
                                    </h3>
                                    <Badge className="ml-auto bg-blue-100 text-blue-800">
                                        {
                                            enhancedOrders.flatMap((o) =>
                                                (o.item || []).filter(
                                                    (it) =>
                                                        it.status ===
                                                            'completed' &&
                                                        (it.result_value ||
                                                            it.result_file),
                                                ),
                                            ).length
                                        }
                                    </Badge>
                                </div>
                                <PreviousResultsTable orders={enhancedOrders} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Modal */}
                <OrderModal
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                    onSave={handleSaveOrder}
                    services={services || []}
                    patientId={patientId}
                />

                {/* Results Dialog */}
                <ResultsEntryDialog
                    isOpen={isResultsDialogOpen}
                    onClose={() => {
                        setIsResultsDialogOpen(false);
                        setSelectedTestOrder(null);
                    }}
                    onSuccess={handleResultsSuccess}
                    testOrder={selectedTestOrder}
                    patientName={(props as any).patient?.name || 'Patient'}
                />
            </div>
        </PatientLayout>
    );
}

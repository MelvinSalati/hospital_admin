// resources/js/pages/radiology/queue.tsx

import { router, usePage } from '@inertiajs/react';
import {
    Clock,
    Eye,
    FileUp,
    Hourglass,
    Image as ImageIcon,
    Microscope,
    ScanLine,
    Upload,
    X,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Action, Column } from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import Http from '@/utils/Http';

// ============================================================================
// Types (match RadiologyController::mapQueueRow)
// ============================================================================

/** In Progress = still has studies to report, Completed = every study done. */
type OrderStatus = 'in_progress' | 'completed';

interface ImagingTest {
    test_name: string;
    modality: string | null;
    body_part: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    status: string;
    amount: number;
    item_id?: number;
}

interface ImagingQueueRow {
    id: number;
    imaging_order_id: number;
    order_number: string;
    visit_token: string;
    patient_id: number | null;
    patient_no: string | null;
    first_name: string | null;
    last_name: string | null;
    name: string;
    gender: string; // already "M/34" or "-/-"
    tests: ImagingTest[];
    priority: string;
    modality: string | null;
    body_part: string | null;
    total_amount: number;
    ordered_by: string;
    ordered_date: string | null;
    /** Optional order status from the backend: 1 = In Progress, 0 = Completed. */
    status?: number | string | boolean | null;
}

interface QueueOrder extends ImagingQueueRow {
    order_status: OrderStatus;
}

interface AuthUser {
    id: number;
    name?: string;
    email?: string;
}

interface Props {
    [key: string]: unknown;
    radiologyQueue?: ImagingQueueRow[];
    auth: {
        user: AuthUser;
    };
}

type QueueTab = 'in_queue' | 'completed';

// ============================================================================
// Constants
// ============================================================================

/** How often the queue refreshes and wait times recalculate. */
const REFRESH_MS = 30_000;

// ============================================================================
// Illustrated avatars (DiceBear)
// ============================================================================

const AVATAR_BASE_URL = 'https://api.dicebear.com/9.x/avataaars/svg';

const AVATAR_STYLE = {
    skinColor: '614335,ae5d29',
    hairColor: '2c1b18,4a312c',
    backgroundColor: 'dbeafe,e0e7ff',
    maleTops:
        'shortCurly,shortFlat,shortRound,frizzle,theCaesar,dreads01,dreads02,sides',
    femaleTops: 'bob,bun,curly,curvy,dreads,fro,froBand,bigHair',
    neutralTops: 'shortCurly,shortFlat,bob,curly,fro,frizzle',
};

const getAvatarUrl = (
    seedId: number | string,
    gender: string | null | undefined,
    pixels: number,
): string => {
    const g = (gender || '').toLowerCase();
    const isMale = g === 'male';
    const isFemale = g === 'female';

    const params = new URLSearchParams({
        seed: `patient-${seedId}`,
        size: String(pixels),
        skinColor: AVATAR_STYLE.skinColor,
        hairColor: AVATAR_STYLE.hairColor,
        backgroundColor: AVATAR_STYLE.backgroundColor,
        top: isMale
            ? AVATAR_STYLE.maleTops
            : isFemale
              ? AVATAR_STYLE.femaleTops
              : AVATAR_STYLE.neutralTops,
        facialHairProbability: isMale ? '25' : '0',
        facialHairColor: '2c1b18',
        accessoriesProbability: '0',
    });

    return `${AVATAR_BASE_URL}?${params.toString()}`;
};

// ============================================================================
// Helpers
// ============================================================================

const formatMoney = (value: number | string): string =>
    `ZMW ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const parseDate = (value?: string | null): Date | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value.replace(' ', 'T'));

    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null): string => {
    const date = parseDate(value);

    return date
        ? date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : 'N/A';
};

const formatTime = (value?: string | null): string => {
    const date = parseDate(value);

    return date
        ? date.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';
};

const formatDateTime = (value?: string | null): string =>
    parseDate(value) ? `${formatDate(value)}, ${formatTime(value)}` : 'N/A';

/** Minutes between the order and `now`, or null when the date is unusable. */
const minutesWaiting = (value: string | null, now: number): number | null => {
    const date = parseDate(value);

    if (!date) {
        return null;
    }

    return Math.max(0, Math.floor((now - date.getTime()) / 60_000));
};

const formatWait = (minutes: number): string => {
    if (minutes < 1) {
        return '<1m';
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = String(minutes % 60).padStart(2, '0');

    return `${hours}h ${rest}m`;
};

/** "M/34" → "male", "F/8" → "female", anything else → null. */
const genderFromSexAge = (value: string | null | undefined): string | null => {
    const first = (value || '').trim().charAt(0).toUpperCase();

    if (first === 'M') {
        return 'male';
    }

    if (first === 'F') {
        return 'female';
    }

    return null;
};

/**
 * Backend `status` wins when it is 0 or 1 (1 → In Progress, 0 → Completed).
 * Otherwise the order is Completed once every study on it is completed.
 */
const resolveOrderStatus = (row: ImagingQueueRow): OrderStatus => {
    const raw = row.status;

    if (raw !== null && raw !== undefined && raw !== '') {
        const numeric = Number(raw);

        if (numeric === 1) {
            return 'in_progress';
        }

        if (numeric === 0) {
            return 'completed';
        }
    }

    const tests = row.tests ?? [];

    return tests.length > 0 &&
        tests.every((t) => String(t.status).toLowerCase() === 'completed')
        ? 'completed'
        : 'in_progress';
};

const normalizeRow = (row: ImagingQueueRow): QueueOrder => ({
    ...row,
    name: row.name?.trim() || 'Unknown patient',
    priority: (row.priority || 'routine').toLowerCase(),
    ordered_by: row.ordered_by || 'N/A',
    tests: row.tests ?? [],
    order_status: resolveOrderStatus(row),
});

const orderedAt = (row: QueueOrder): number =>
    parseDate(row.ordered_date)?.getTime() ?? 0;

const isUrgent = (priority: string): boolean =>
    ['stat', 'emergency', 'urgent'].includes(priority);

// ============================================================================
// Badge components
// ============================================================================

const STATUS_CONFIG: Record<
    OrderStatus,
    { label: string; color: string; dot: string }
> = {
    in_progress: {
        label: 'In Progress',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    completed: {
        label: 'Completed',
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        dot: 'bg-slate-500',
    },
};

const StatusBadge: FC<{ status: OrderStatus }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.in_progress;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const PriorityBadge: FC<{ priority: string }> = ({ priority }) => {
    const config: Record<string, { label: string; color: string }> = {
        routine: {
            label: 'Routine',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        urgent: {
            label: 'Urgent',
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        },
        emergency: {
            label: 'Emergency',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        stat: {
            label: 'STAT',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
    };

    const cfg = config[priority] || config.routine;

    return (
        <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
};

const ModalityBadge: FC<{ modality: string | null }> = ({ modality }) =>
    modality ? (
        <span className="inline-flex items-center rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
            {modality}
        </span>
    ) : (
        <span className="text-xs text-slate-400">—</span>
    );

/** Live wait time. Turns amber after 30 minutes and red after an hour. */
const WaitBadge: FC<{ minutes: number | null }> = ({ minutes }) => {
    if (minutes === null) {
        return <span className="text-xs text-slate-400">—</span>;
    }

    const tone =
        minutes >= 60
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : minutes >= 30
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
        >
            <Hourglass size={12} />
            {formatWait(minutes)}
        </span>
    );
};

const PatientAvatar: FC<{
    name: string;
    seedId: number | string;
    gender?: string | null;
    size?: 'sm' | 'lg';
}> = ({ name, seedId, gender, size = 'sm' }) => {
    const [failed, setFailed] = useState(false);

    const dimension = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
    const pixels = size === 'lg' ? 96 : 72;

    const initials = (name || '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (failed) {
        return (
            <div
                className={`flex ${dimension} shrink-0 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}
            >
                {initials || '?'}
            </div>
        );
    }

    return (
        <img
            src={getAvatarUrl(seedId, gender, pixels)}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`${dimension} shrink-0 rounded-full bg-blue-100 object-cover dark:bg-blue-900/40`}
        />
    );
};

const DetailField: FC<{ label: string; children: ReactNode }> = ({
    label,
    children,
}) => (
    <div>
        <Label className="text-xs text-slate-500">{label}</Label>
        <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
            {children}
        </div>
    </div>
);

// ============================================================================
// Upload results modal (original structure and styling)
// ============================================================================

function UploadResultModal({
    open,
    order,
    onCancel,
    onSaved,
    auth,
}: {
    open: boolean;
    order: ImagingQueueRow | null;
    onCancel: () => void;
    onSaved: () => void;
    auth: { user: AuthUser };
}) {
    const tests = order?.tests ?? [];

    const [files, setFiles] = useState<File[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [fileType, setFileType] = useState<
        'image' | 'dicom' | 'pdf' | 'report' | 'other'
    >('image');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setFiles([]);
        setSelectedItems(new Set());
        setFileType('image');
        setNotes('');
        setErrors({});
        if (inputRef.current) inputRef.current.value = '';
    }, [open, order?.imaging_order_id]);

    // ---------- files ----------
    const addFiles = (list: FileList | null) => {
        if (!list) return;
        setErrors((e) => {
            const { files: _f, ...rest } = e;
            return rest;
        });

        const incoming = Array.from(list);
        const valid: File[] = [];
        let msg: string | null = null;

        for (const f of incoming) {
            if (f.size > 20 * 1024 * 1024) {
                msg = 'Max file size is 20MB';
                continue;
            }
            if (files.some((x) => x.name === f.name && x.size === f.size))
                continue;
            valid.push(f);
        }

        if (valid.length) setFiles((prev) => [...prev, ...valid]);
        if (msg) setErrors((e) => ({ ...e, files: msg! }));
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (idx: number) =>
        setFiles((prev) => prev.filter((_, i) => i !== idx));

    // ---------- items ----------
    const toggleItem = (id: number) =>
        setSelectedItems((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleAllItems = () => {
        const ids = tests.map((t) => t.item_id).filter(Boolean) as number[];
        setSelectedItems((prev) =>
            prev.size === ids.length ? new Set() : new Set(ids),
        );
    };

    // ---------- submit ----------
    const handleSubmit = async () => {
        if (!order) return;

        const errs: Record<string, string> = {};
        if (files.length === 0) errs.files = 'Add at least one file';
        if (Object.keys(errs).length) return setErrors(errs);

        setSaving(true);

        // ---- Build multipart payload ----
        const form = new FormData();

        // multi-file
        files.forEach((f) => form.append('files[]', f));

        // multi-item (mirrors lab's test_names[])
        selectedItems.forEach((id) =>
            form.append('imaging_order_item_ids[]', String(id)),
        );

        form.append('file_type', fileType);
        form.append('uploaded_by', String(auth.user.id));
        if (notes) form.append('notes', notes);

        try {
            await Http.post(
                `/radiology/orders/${order.imaging_order_id}/results`,
                form,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                },
            );

            router.reload({ only: ['radiologyQueue'] });
            Notiflix.Notify.success(
                `Queued ${files.length} file(s)` +
                    (selectedItems.size
                        ? ` for ${selectedItems.size} item(s)`
                        : ''),
            );
            setErrors({});
            onSaved();
        } catch (err: any) {
            const serverErrors =
                err?.response?.data?.errors ?? err?.errors ?? {};
            setErrors(serverErrors);
            Notiflix.Notify.failure(
                serverErrors?.files?.[0] ??
                    serverErrors?.files ??
                    err?.response?.data?.message ??
                    'Upload failed',
            );
        } finally {
            setSaving(false);
        }
    };

    if (!open || !order) return null;

    const allSelected =
        tests.length > 0 &&
        selectedItems.size === tests.filter((t) => !!t.item_id).length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
                            <FileUp size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">
                                Upload Imaging Results
                            </h3>
                            <p className="text-sm text-slate-500">
                                {order.name} ·{' '}
                                <span className="font-mono">
                                    {order.order_number}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
                    {/* LEFT — files */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                                Files{' '}
                                <span className="text-slate-400">
                                    ({files.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
                            >
                                <FileUp size={14} /> Add
                            </button>
                        </div>

                        <label
                            htmlFor="imaging-files"
                            className={cn(
                                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center',
                                errors.files
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50',
                            )}
                        >
                            <FileUp size={28} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                                Click to add image / DICOM / PDF
                            </span>
                            <span className="text-xs text-slate-400">
                                Multiple allowed · max 20MB each
                            </span>
                        </label>
                        <input
                            ref={inputRef}
                            id="imaging-files"
                            type="file"
                            accept="image/*,application/dicom,.pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => addFiles(e.target.files)}
                        />
                        {errors.files && (
                            <p className="mt-2 text-xs text-red-600">
                                {errors.files}
                            </p>
                        )}

                        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                            {files.map((f, i) => (
                                <li
                                    key={`${f.name}-${i}`}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                >
                                    <ImageIcon
                                        size={16}
                                        className="shrink-0 text-purple-500"
                                    />
                                    <span className="flex-1 truncate">
                                        {f.name}
                                    </span>
                                    <span className="shrink-0 text-xs text-slate-400">
                                        {(f.size / 1024).toFixed(0)} KB
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </li>
                            ))}
                            {files.length === 0 && (
                                <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                                    No files added yet
                                </li>
                            )}
                        </ul>

                        <div className="mt-3 space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                                File type
                            </label>
                            <select
                                value={fileType}
                                onChange={(e) =>
                                    setFileType(e.target.value as any)
                                }
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="image">
                                    Image (X-Ray / US)
                                </option>
                                <option value="dicom">DICOM</option>
                                <option value="pdf">PDF</option>
                                <option value="report">Report</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="mt-3 space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                                Notes (optional)
                            </label>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                placeholder="e.g. Chest PA + lateral"
                            />
                        </div>
                    </div>

                    {/* RIGHT — items multi-select */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                                Items covered{' '}
                                <span className="text-slate-400">
                                    ({selectedItems.size}/{tests.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={toggleAllItems}
                                className="text-sm font-medium text-purple-600 hover:underline"
                            >
                                {allSelected ? 'Clear all' : 'Select all'}
                            </button>
                        </div>

                        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                            {tests.map((t, idx) => {
                                const checked = t.item_id
                                    ? selectedItems.has(t.item_id)
                                    : false;
                                return (
                                    <li key={`${t.test_name}-${idx}`}>
                                        <label
                                            className={cn(
                                                'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                                                checked
                                                    ? 'bg-purple-100'
                                                    : 'hover:bg-white',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    t.item_id &&
                                                    toggleItem(t.item_id)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="flex-1">
                                                <span className="block truncate font-medium text-slate-800">
                                                    {t.test_name}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {t.modality ?? '-'} ·{' '}
                                                    {t.body_part ?? '-'}
                                                </span>
                                            </span>
                                            <span className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 capitalize">
                                                {t.status}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                            {tests.length === 0 && (
                                <li className="p-6 text-center text-sm text-slate-400">
                                    No items on this order
                                </li>
                            )}
                        </ul>

                        {selectedItems.size === 0 && (
                            <p className="mt-2 text-[11px] text-slate-500">
                                No item selected → files will attach to the
                                order as a whole.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">
                            {files.length}
                        </span>{' '}
                        file(s) ·{' '}
                        <span className="font-semibold text-slate-800">
                            {selectedItems.size}
                        </span>{' '}
                        item(s)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            disabled={saving}
                            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                            <Upload size={15} />
                            {saving ? 'Uploading…' : `Upload (${files.length})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Main component
// ============================================================================

export default function RadiologyQueue() {
    const { radiologyQueue = [], auth } = usePage<Props>().props;
    console.log(radiologyQueue);
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [uploadId, setUploadId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<QueueTab>('in_queue');
    const [now, setNow] = useState(() => Date.now());

    // Keep wait times ticking and the queue fresh while the tab is visible.
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());

            if (document.visibilityState === 'visible') {
                router.reload({ only: ['radiologyQueue'] });
            }
        }, REFRESH_MS);

        return () => clearInterval(timer);
    }, []);

    const processedQueue = useMemo<QueueOrder[]>(
        () => radiologyQueue.map(normalizeRow),
        [radiologyQueue],
    );

    // In Progress: oldest order first. Completed: most recent first.
    const inQueue = useMemo(
        () =>
            processedQueue
                .filter((o) => o.order_status === 'in_progress')
                .sort((a, b) => orderedAt(a) - orderedAt(b)),
        [processedQueue],
    );

    const completed = useMemo(
        () =>
            processedQueue
                .filter((o) => o.order_status === 'completed')
                .sort((a, b) => orderedAt(b) - orderedAt(a)),
        [processedQueue],
    );

    const tableData = activeTab === 'in_queue' ? inQueue : completed;

    // Look the open order up by id so refreshes keep the dialog current.
    const detailsOrder =
        processedQueue.find((o) => o.imaging_order_id === detailsId) ?? null;
    const uploadOrder =
        processedQueue.find((o) => o.imaging_order_id === uploadId) ?? null;

    const detailsTotal = useMemo(
        () =>
            (detailsOrder?.tests ?? []).reduce(
                (sum, t) => sum + Number(t.amount ?? 0),
                0,
            ),
        [detailsOrder],
    );

    // ------------------------------------------------------------------------
    // Columns
    // ------------------------------------------------------------------------

    const columns: Column<QueueOrder>[] = [
        {
            id: 'order_number',
            label: 'Order',
            sortable: true,
            format: (value, row) => (
                <span className="inline-flex items-center gap-2">
                    {isUrgent(row.priority) &&
                        row.priority !== 'urgent' &&
                        row.order_status === 'in_progress' && (
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                        )}
                    <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                        {(value as string) || 'N/A'}
                    </span>
                </span>
            ),
        },
        {
            id: 'name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_value, row) => (
                <div className="flex items-center gap-2.5">
                    <PatientAvatar
                        name={row.name}
                        seedId={row.patient_id ?? row.id}
                        gender={genderFromSexAge(row.gender)}
                    />
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            {row.patient_no && (
                                <span>EMR #: {row.patient_no}</span>
                            )}
                            {row.gender && row.gender !== '-/-' && (
                                <>
                                    {row.patient_no && <span>•</span>}
                                    <span>{row.gender}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'modality',
            label: 'Modality',
            sortable: true,
            format: (_value, row) => <ModalityBadge modality={row.modality} />,
        },
        {
            id: 'tests',
            label: 'Studies',
            format: (_value, row) => {
                const count = row.tests.length;
                const done = row.tests.filter(
                    (t) => String(t.status).toLowerCase() === 'completed',
                ).length;

                return (
                    <button
                        type="button"
                        onClick={() => setDetailsId(row.imaging_order_id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                    >
                        <ScanLine size={12} />
                        {done}/{count} done
                    </button>
                );
            },
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: true,
            format: (_value, row) => <PriorityBadge priority={row.priority} />,
        },
        {
            id: 'order_status',
            label: 'Status',
            sortable: true,
            format: (_value, row) => <StatusBadge status={row.order_status} />,
        },
        {
            id: 'ordered_date',
            label: activeTab === 'in_queue' ? 'Waiting' : 'Ordered',
            sortable: true,
            format: (value, row) => (
                <div className="flex flex-col gap-1">
                    {row.order_status === 'in_progress' && (
                        <WaitBadge
                            minutes={minutesWaiting(row.ordered_date, now)}
                        />
                    )}
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(value as string)}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'total_amount',
            label: 'Total',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formatMoney(value as number)}
                </span>
            ),
        },
        {
            id: 'ordered_by',
            label: 'Ordered By',
            sortable: true,
            format: (value) => (
                <span className="text-sm text-slate-700 capitalize dark:text-slate-300">
                    {(value as string) || '—'}
                </span>
            ),
        },
    ];

    // ------------------------------------------------------------------------
    // Actions (Upload only makes sense while the order is in progress)
    // ------------------------------------------------------------------------

    const actions: Action<QueueOrder>[] = [
        ...(activeTab === 'in_queue'
            ? [
                  {
                      label: 'Upload Images',
                      icon: <FileUp size={16} />,
                      color: 'primary',
                      onClick: (row: QueueOrder) =>
                          setUploadId(row.imaging_order_id),
                  } as Action<QueueOrder>,
              ]
            : [
                  {
                      label: 'View Dashboard',
                      icon: <Eye size={16} />,
                      color: 'primary',
                      show: (row: QueueOrder) => !!row.patient_id,
                      onClick: (row: QueueOrder) =>
                          router.visit(`/patients/dashboard/${row.patient_id}`),
                  } as Action<QueueOrder>,
              ]),
        {
            label: 'View Order',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => setDetailsId(row.imaging_order_id),
        },
    ];

    // ------------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------------

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'Department' },
                { href: '/radiology/queue', title: 'Radiology' },
            ]}
        >
            <PageHeader
                icon={<Microscope />}
                title="Radiology Encounter Queue"
                subtitle="Review imaging studies and upload results for clinician review"
                actions={[
                    {
                        label: `In Progress (${inQueue.length})`,
                        onClick: () => setActiveTab('in_queue'),
                        variant: activeTab === 'in_queue' ? 'cyan' : 'default',
                    },
                    {
                        label: `Completed (${completed.length})`,
                        onClick: () => setActiveTab('completed'),
                        variant: activeTab === 'completed' ? 'cyan' : 'default',
                    },
                ]}
            />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-4 bg-blue-50 p-4 dark:bg-slate-900">
                <ReusableTable
                    key={activeTab}
                    columns={columns}
                    data={tableData}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by patient name, order number, or token..."
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="ordered_date"
                    defaultOrderDirection={
                        activeTab === 'in_queue' ? 'asc' : 'desc'
                    }
                    emptyMessage={
                        activeTab === 'in_queue'
                            ? 'No imaging studies in progress'
                            : 'No completed imaging studies found'
                    }
                    className="shadow-sm"
                />

                {/* Order details modal */}
                <Dialog
                    open={detailsOrder !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDetailsId(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-sm">
                                Imaging Order
                            </DialogTitle>
                        </DialogHeader>

                        {detailsOrder && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <PatientAvatar
                                        name={detailsOrder.name}
                                        seedId={
                                            detailsOrder.patient_id ??
                                            detailsOrder.id
                                        }
                                        gender={genderFromSexAge(
                                            detailsOrder.gender,
                                        )}
                                        size="lg"
                                    />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {detailsOrder.name}
                                        </p>
                                        <p className="font-mono text-xs text-slate-500">
                                            {detailsOrder.order_number}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField label="EMR number">
                                        {detailsOrder.patient_no || 'N/A'}
                                    </DetailField>
                                    <DetailField label="Sex / Age">
                                        {detailsOrder.gender || 'N/A'}
                                    </DetailField>
                                    <DetailField label="Priority">
                                        <PriorityBadge
                                            priority={detailsOrder.priority}
                                        />
                                    </DetailField>
                                    <DetailField label="Status">
                                        <StatusBadge
                                            status={detailsOrder.order_status}
                                        />
                                    </DetailField>
                                    <DetailField label="Modality">
                                        <ModalityBadge
                                            modality={detailsOrder.modality}
                                        />
                                    </DetailField>
                                    <DetailField label="Visit token">
                                        {detailsOrder.visit_token || 'N/A'}
                                    </DetailField>
                                    <DetailField label="Ordered by">
                                        <span className="capitalize">
                                            {detailsOrder.ordered_by}
                                        </span>
                                    </DetailField>
                                    <DetailField label="Ordered">
                                        {formatDateTime(
                                            detailsOrder.ordered_date,
                                        )}
                                    </DetailField>
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Studies ({detailsOrder.tests.length})
                                    </Label>
                                    <ul className="mt-1 max-h-56 space-y-2 overflow-y-auto pr-1">
                                        {detailsOrder.tests.map((t, idx) => (
                                            <li
                                                key={`${t.test_name}-${idx}`}
                                                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                                        {t.test_name}
                                                    </p>
                                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 capitalize dark:bg-slate-700 dark:text-slate-300">
                                                        {t.status}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                                                    <ScanLine size={11} />
                                                    <span>
                                                        {t.modality ?? '-'}
                                                    </span>
                                                    <span>·</span>
                                                    <span>
                                                        {t.body_part ?? '-'}
                                                    </span>
                                                    <span>
                                                        · Qty {t.quantity}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                                                    <span>
                                                        ×{' '}
                                                        {formatMoney(
                                                            t.unit_price,
                                                        )}
                                                    </span>
                                                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                                        {formatMoney(t.amount)}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                        {detailsOrder.tests.length === 0 && (
                                            <li className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                                                No items on this order
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="flex items-center justify-between border-t pt-3 text-sm">
                                    <span className="text-slate-600 dark:text-slate-300">
                                        Total
                                    </span>
                                    <span className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400">
                                        {formatMoney(
                                            detailsTotal ||
                                                detailsOrder.total_amount,
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-end gap-2">
                                    {detailsOrder.order_status ===
                                        'in_progress' && (
                                        <Button
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => {
                                                const id =
                                                    detailsOrder.imaging_order_id;

                                                setDetailsId(null);
                                                setUploadId(id);
                                            }}
                                        >
                                            <FileUp className="mr-1 h-3.5 w-3.5" />
                                            Upload images
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => setDetailsId(null)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Upload results modal */}
                <UploadResultModal
                    open={uploadOrder !== null}
                    order={uploadOrder}
                    onCancel={() => setUploadId(null)}
                    onSaved={() => setUploadId(null)}
                    auth={auth}
                />
            </div>
        </AppLayout>
    );
}

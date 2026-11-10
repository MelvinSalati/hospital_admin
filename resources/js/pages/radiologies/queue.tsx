import { router, usePage } from '@inertiajs/react';
import {
    Microscope,
    ScanLine,
    X,
    Receipt,
    CheckCircle2,
    Upload,
    FileText,
    FileUp,
    Image as ImageIcon,
    AlertTriangle,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useMemo, useRef, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import Http from '@/utils/Http';

// ============ TYPES (match RadiologyController::mapQueueRow) ============
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
    priority: 'routine' | 'urgent' | string;
    modality: string | null;
    body_part: string | null;
    total_amount: number;
    ordered_by: string;
    ordered_date: string | null;
}

interface AuthUser {
    id: number;
    name?: string;
    email?: string;
}

interface Props {
    radiologyQueue: ImagingQueueRow[];
    auth: {
        user: AuthUser;
    };
}

// ============ HELPERS ============
const formatMoney = (n: number | string) =>
    `ZMW ${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const priorityBadge = (p: string) =>
    p === 'urgent'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';

// ============ UPLOAD MODAL ============
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
// ============ DRAWER ============
function OrderDetailDrawer({
    order,
    isOpen,
    onClose,
}: {
    order: ImagingQueueRow | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const tests = order?.tests ?? [];
    const total = useMemo(
        () => tests.reduce((s, t) => s + Number(t.amount ?? 0), 0),
        [tests],
    );

    if (!order) return null;

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
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Imaging Order
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                {order.order_number}
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

                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-600 text-xs font-semibold text-white">
                        {order.first_name?.[0] ?? '?'}
                        {order.last_name?.[0] ?? ''}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                            {order.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {order.gender} · ordered by {order.ordered_by}
                        </p>
                    </div>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium capitalize',
                            priorityBadge(order.priority),
                        )}
                    >
                        {order.priority === 'urgent' && (
                            <AlertTriangle size={11} />
                        )}
                        {order.priority}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        Studies ({tests.length})
                    </h3>

                    <ul className="space-y-2">
                        {tests.map((t, idx) => (
                            <li
                                key={`${t.test_name}-${idx}`}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {t.test_name}
                                    </p>
                                    <span className="rounded bg-white px-2 py-0.5 text-[10px] text-slate-600 capitalize">
                                        {t.status}
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                                    <ScanLine size={11} />
                                    <span>{t.modality ?? '-'}</span>
                                    <span>·</span>
                                    <span>{t.body_part ?? '-'}</span>
                                    <span>· Qty {t.quantity}</span>
                                </div>
                                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                                    <span>× {formatMoney(t.unit_price)}</span>
                                    <span className="font-mono font-semibold text-slate-900">
                                        {formatMoney(t.amount)}
                                    </span>
                                </div>
                            </li>
                        ))}
                        {tests.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                No items on this order
                            </li>
                        )}
                    </ul>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total</span>
                        <span className="font-mono text-base font-semibold text-purple-600">
                            {formatMoney(total || order.total_amount)}
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

// ============ MAIN ============
export default function RadiologyQueue() {
    const { props } = usePage<Props>();
    const rows = props.radiologyQueue || [];
    const auth = props.auth;

    const [selectedOrder, setSelectedOrder] = useState<ImagingQueueRow | null>(
        null,
    );
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [uploadOrder, setUploadOrder] = useState<ImagingQueueRow | null>(
        null,
    );
    const [uploadOpen, setUploadOpen] = useState(false);

    const openDetails = (row: ImagingQueueRow) => {
        setSelectedOrder(row);
        setDrawerOpen(true);
    };
    const closeDetails = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedOrder(null), 250);
    };

    const openUpload = (row: ImagingQueueRow) => {
        setUploadOrder(row);
        setUploadOpen(true);
    };
    const closeUpload = () => {
        setUploadOpen(false);
        setTimeout(() => setUploadOrder(null), 200);
    };

    const columns: Column<ImagingQueueRow>[] = [
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
            id: 'name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600 text-[10px] font-semibold text-white">
                        {row.first_name?.[0] ?? '?'}
                        {row.last_name?.[0] ?? ''}
                    </div>
                    <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        {row.patient_no && (
                            <p className="font-mono text-[11px] text-slate-400">
                                {row.patient_no}
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
                <span className="text-xs text-slate-600">{value}</span>
            ),
        },
        {
            id: 'modality',
            label: 'Modality',
            format: (value) => (
                <span className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                    {value ?? '—'}
                </span>
            ),
        },
        {
            id: 'tests',
            label: 'Studies',
            format: (_, row) => {
                const count = row.tests?.length ?? 0;
                const done =
                    row.tests?.filter((t) => t.status === 'completed').length ??
                    0;
                return (
                    <button
                        onClick={() => openDetails(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100"
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
            format: (value) => (
                <span
                    className={cn(
                        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium capitalize',
                        priorityBadge(String(value)),
                    )}
                >
                    {String(value) === 'urgent' && <AlertTriangle size={11} />}
                    {String(value)}
                </span>
            ),
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
            id: 'ordered_by',
            label: 'Ordered By',
            format: (value) => (
                <span className="text-xs text-slate-600 capitalize">
                    {value || '—'}
                </span>
            ),
        },
    ];

    const actions: Action<ImagingQueueRow>[] = [
        {
            label: 'Upload Images',
            icon: <FileUp size={16} />,
            color: 'success',
            onClick: (row) => openUpload(row),
        },
        {
            label: 'View Order',
            icon: <Receipt size={16} />,
            color: 'info',
            onClick: (row) => openDetails(row),
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Radiology' },
                { href: '', title: 'Queue' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-100 p-4">
                <PageHeader
                    icon={<Microscope className="h-5 w-5" />}
                    title="Radiology Department"
                    subtitle="Review pending imaging studies and upload results for clinician review"
                />

                <ReusableTable
                    title="Imaging Queue"
                    columns={columns}
                    data={rows}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by name, order number, or token..."
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="ordered_date"
                    defaultOrderDirection="asc"
                    emptyMessage="No pending imaging studies"
                    className="shadow-sm"
                />
            </div>

            <OrderDetailDrawer
                order={selectedOrder}
                isOpen={drawerOpen}
                onClose={closeDetails}
            />

            <UploadResultModal
                open={uploadOpen}
                order={uploadOrder}
                onCancel={closeUpload}
                onSaved={closeUpload}
                auth={auth}
            />
        </AppLayout>
    );
}

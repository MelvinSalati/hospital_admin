// resources/js/pages/laboratory/Nurses.tsx
import { router, usePage } from '@inertiajs/react';
import {
    Microscope,
    FlaskConical,
    X,
    Trash2,
    Receipt,
    ShieldCheck,
    CheckCircle2,
    KeyRound,
    Upload,
    FileText,
    FilePlus2,
    FileUp,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useMemo, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import Http from '@/utils/Http';

const APPROVAL_CODE = '902027';

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
    return map[status] ?? map.pending;
};

// ============ APPROVAL CODE PROMPT ============
function AdminCodePrompt({
    open,
    testName,
    onCancel,
    onSubmit,
    busy,
}: {
    open: boolean;
    testName: string | null;
    onCancel: () => void;
    onSubmit: (code: string) => void;
    busy: boolean;
}) {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleCancel = () => {
        setCode('');
        setError(null);
        onCancel();
    };

    const handleSubmit = () => {
        if (!code) return;
        if (code.trim() !== APPROVAL_CODE) {
            setError('Invalid approval code.');
            return;
        }
        setError(null);
        onSubmit(code);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-red-600" />
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Approval Code Required
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Remove "{testName}"
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4">
                    <input
                        type="password"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value);
                            if (error) setError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Approval code"
                        autoFocus
                        className={cn(
                            'w-full rounded-md border px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:outline-none',
                            error
                                ? 'border-red-400 focus:ring-red-100'
                                : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100',
                        )}
                    />
                    {error && (
                        <p className="mt-2 text-[11px] text-red-600">{error}</p>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={busy}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={busy || !code}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {busy ? 'Removing…' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ UPLOAD RESULT MODAL ============
function UploadResultModal({
    open,
    order,
    onCancel,
    onSaved,
    auth,
    patientId,
}: {
    open: boolean;
    order: QueuePatient | null;
    onCancel: () => void;
    onSaved: () => void;
    auth: { user: { id: number } };
    patientId: number | null;
}) {
    const tests = order?.tests ?? [];
    const [files, setFiles] = useState<File[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open || !order) return;
        setFiles([]);
        setSelected([]);
        setErrors({});
        if (inputRef.current) inputRef.current.value = '';
    }, [open, order?.lab_order_id]);

    const toggleTest = (name: string) =>
        setSelected((prev) =>
            prev.includes(name)
                ? prev.filter((n) => n !== name)
                : [...prev, name],
        );

    const toggleAll = () => {
        if (selected.length === tests.length) setSelected([]);
        else setSelected(tests.map((t) => t.test_name));
    };

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        setErrors((e) => {
            const { pdf, pdfs, ...rest } = e;
            return rest;
        });

        const incoming = Array.from(list);
        const valid: File[] = [];
        let msg: string | null = null;

        for (const f of incoming) {
            if (f.type !== 'application/pdf') {
                msg = 'Only PDF files are allowed';
                continue;
            }
            if (f.size > 10 * 1024 * 1024) {
                msg = 'Max file size is 10MB';
                continue;
            }
            if (files.some((x) => x.name === f.name && x.size === f.size))
                continue;
            valid.push(f);
        }

        if (valid.length) setFiles((prev) => [...prev, ...valid]);
        if (msg) setErrors((e) => ({ ...e, pdf: msg! }));
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (idx: number) =>
        setFiles((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmitResults = async () => {
        if (!order?.lab_order_id) {
            Notiflix.Notify.failure('Missing order id');
            return;
        }
        if (!patientId) {
            Notiflix.Notify.failure('Missing patient id');
            return;
        }

        const errs: Record<string, string> = {};
        if (files.length === 0) errs.pdf = 'Please add at least one PDF';
        if (selected.length === 0) errs.tests = 'Select at least one test';
        if (Object.keys(errs).length) return setErrors(errs);

        setSaving(true);

        // Build multipart payload
        const form = new FormData();
        files.forEach((f) => form.append('pdfs[]', f));
        selected.forEach((name) => form.append('test_names[]', name));

        try {
            // Don't set Content-Type manually — the browser adds the boundary.
            const response = await Http.post(
                `${auth.user.id}/laboratory/${patientId}/orders/${order.lab_order_id}/results/upload`,
                form,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                },
            );

            router.reload({ only: ['queue'] });
            Notiflix.Notify.success(
                `Uploaded ${files.length} file(s) for ${selected.length} test(s)`,
            );
            setErrors({});
            onSaved();
        } catch (err: any) {
            const serverErrors =
                err?.response?.data?.errors ?? err?.errors ?? {};
            setErrors(serverErrors);
            Notiflix.Notify.failure(
                serverErrors?.pdfs?.[0] ??
                    serverErrors?.pdf?.[0] ??
                    err?.response?.data?.message ??
                    'Upload failed',
            );
        } finally {
            setSaving(false);
        }
    };

    if (!open || !order) return null;

    const allSelected = tests.length > 0 && selected.length === tests.length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex h-[65vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <FileUp size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">
                                Upload Results
                            </h3>
                            <p className="text-sm text-slate-500">
                                {order.first_name} {order.last_name} ·{' '}
                                <span className="font-mono">{order.token}</span>
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

                {/* Body — two columns, each scrolls independently */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-2">
                    {/* LEFT — files */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                                Result PDFs{' '}
                                <span className="text-slate-400">
                                    ({files.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                                <FileUp size={14} /> Add
                            </button>
                        </div>

                        <label
                            htmlFor="result-pdfs"
                            className={cn(
                                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center',
                                errors.pdf || errors.pdfs
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50',
                            )}
                        >
                            <FileUp size={28} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                                Click to add PDF(s)
                            </span>
                            <span className="text-xs text-slate-400">
                                Multiple allowed · max 10MB each
                            </span>
                        </label>
                        <input
                            ref={inputRef}
                            id="result-pdfs"
                            type="file"
                            accept="application/pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => addFiles(e.target.files)}
                        />
                        {(errors.pdf || errors.pdfs) && (
                            <p className="mt-2 text-xs text-red-600">
                                {errors.pdf ?? errors.pdfs}
                            </p>
                        )}

                        {/* File list */}
                        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                            {files.map((f, i) => (
                                <li
                                    key={`${f.name}-${i}`}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                >
                                    <FileText
                                        size={18}
                                        className="shrink-0 text-red-500"
                                    />
                                    <span className="flex-1 truncate text-slate-700">
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
                    </div>

                    {/* RIGHT — tests */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                                Tests covered{' '}
                                <span className="text-slate-400">
                                    ({selected.length}/{tests.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-sm font-medium text-blue-600 hover:underline"
                            >
                                {allSelected ? 'Clear all' : 'Select all'}
                            </button>
                        </div>

                        <ul
                            className={cn(
                                'min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border p-2',
                                errors.tests
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-200 bg-slate-50',
                            )}
                        >
                            {tests.map((t) => {
                                const checked = selected.includes(t.test_name);
                                return (
                                    <li key={t.test_name}>
                                        <label
                                            className={cn(
                                                'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                                                checked
                                                    ? 'bg-blue-100'
                                                    : 'hover:bg-white',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    toggleTest(t.test_name)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="flex-1 truncate font-medium text-slate-800">
                                                {t.test_name}
                                            </span>
                                            <span
                                                className={cn(
                                                    'shrink-0 rounded px-2 py-0.5 text-[11px] font-medium capitalize',
                                                    t.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700',
                                                )}
                                            >
                                                {t.status}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                            {tests.length === 0 && (
                                <li className="p-6 text-center text-sm text-slate-400">
                                    No tests on this order
                                </li>
                            )}
                        </ul>
                        {errors.tests && (
                            <p className="mt-2 text-xs text-red-600">
                                {errors.tests}
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
                            {selected.length}
                        </span>{' '}
                        test(s) selected
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
                            onClick={handleSubmitResults}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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

// ============ ORDER DRAWER ============
function OrderDetailDrawer({
    order,
    isOpen,
    onClose,
}: {
    order: QueuePatient | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [removing, setRemoving] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<string | null>(null);
    const [promptOpen, setPromptOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const tests = order?.tests ?? [];
    const overallTotal = useMemo(
        () => tests.reduce((s, t) => s + Number(t.amount ?? 0), 0),
        [tests],
    );

    const alreadyAccepted = order?.status === 'accepted';

    const askRemove = (testName: string) => {
        setPendingRemove(testName);
        setPromptOpen(true);
    };

    const submitAdminCode = (code: string) => {
        if (!order?.lab_order_id || !pendingRemove) return;
        setRemoving(pendingRemove);
        router.delete(
            `/laboratory/orders/${order.lab_order_id}/items/${encodeURIComponent(pendingRemove)}`,
            {
                preserveScroll: true,
                data: { admin_code: code },
                onSuccess: () => {
                    Notiflix.Notify.success(`"${pendingRemove}" removed`);
                    setPromptOpen(false);
                    setPendingRemove(null);
                    router.reload({ only: ['queue'] });
                },
                onError: (errs) =>
                    Notiflix.Notify.failure(
                        (errs as any)?.admin_code ??
                            (errs as any)?.message ??
                            'Failed to remove',
                    ),
                onFinish: () => setRemoving(null),
            },
        );
    };

    const confirmWithPatient = () => {
        if (!order?.lab_order_id) return;
        Notiflix.Confirm.show(
            'Patient Acceptance',
            `Patient accepts total of ${formatMoney(overallTotal)}?`,
            'Yes, Accept',
            'Cancel',
            () => {
                setConfirming(true);
                router.post(
                    `/laboratory/orders/${order.lab_order_id}/accept`,
                    { total_amount: overallTotal },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            Notiflix.Notify.success('Order accepted');
                            onClose();
                            router.reload({ only: ['queue'] });
                        },
                        onError: () =>
                            Notiflix.Notify.failure('Failed to accept'),
                        onFinish: () => setConfirming(false),
                    },
                );
            },
            () => {},
            { okButtonColor: '#2563eb' },
        );
    };

    const openInvoice = () => {
        Notiflix.Notify.info('Invoice — not implemented yet');
    };

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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Lab Order Details
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
                            {order.gender || '—'} · {order.ordered_by}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        Ordered Tests ({tests.length})
                    </h3>

                    <ul className="space-y-2">
                        {tests.map((t, idx) => (
                            <li
                                key={`${t.test_name}-${idx}`}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-[10px] font-semibold text-blue-600">
                                            {idx + 1}
                                        </span>
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {t.test_name}
                                        </p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 pl-7 text-[11px] text-slate-500">
                                        <span>Qty {t.quantity}</span>
                                        <span>×</span>
                                        <span className="font-mono">
                                            {formatMoney(t.unit_price)}
                                        </span>
                                        <span
                                            className={cn(
                                                'rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                                t.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700',
                                            )}
                                        >
                                            {t.status}
                                        </span>
                                    </div>
                                    {t.result_file && (
                                        <a
                                            href={t.result_file}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 ml-7 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                        >
                                            <FileText size={11} /> View result
                                            PDF
                                        </a>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 pl-3">
                                    <span className="font-mono text-xs font-semibold text-slate-900">
                                        {formatMoney(t.amount ?? t.total_price)}
                                    </span>
                                    <button
                                        onClick={() => askRemove(t.test_name)}
                                        disabled={removing === t.test_name}
                                        className="ml-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                        title="Remove test"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}

                        {tests.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                No tests on this order
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
                        onClick={openInvoice}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <FilePlus2 size={14} />
                        Invoice
                    </button>

                    <button
                        onClick={confirmWithPatient}
                        disabled={alreadyAccepted || confirming}
                        className={cn(
                            'mt-2 flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-white',
                            alreadyAccepted
                                ? 'cursor-not-allowed bg-emerald-600'
                                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50',
                        )}
                    >
                        {alreadyAccepted ? (
                            <>
                                <CheckCircle2 size={14} /> Accepted
                            </>
                        ) : confirming ? (
                            <>
                                <ShieldCheck size={14} /> Confirming…
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={14} /> Confirm Total
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </footer>
            </aside>

            <AdminCodePrompt
                open={promptOpen}
                testName={pendingRemove}
                busy={removing !== null}
                onCancel={() => {
                    setPromptOpen(false);
                    setPendingRemove(null);
                }}
                onSubmit={submitAdminCode}
            />
        </>
    );
}

// ============ MAIN COMPONENT ============
export default function Laboratory() {
    const { props } = usePage<Props>();
    const queues = props.queue || [];
    const [selectedOrder, setSelectedOrder] = useState<QueuePatient | null>(
        null,
    );
    const [patientId, setPatientId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [resultsOrder, setResultsOrder] = useState<QueuePatient | null>(null);
    const [resultsOpen, setResultsOpen] = useState(false);

    const openDetails = (row: QueuePatient) => {
        setSelectedOrder(row);
        setDrawerOpen(true);
    };

    const closeDetails = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedOrder(null), 250);
    };

    const openResults = (row: QueuePatient) => {
        setResultsOrder(row);
        setResultsOpen(true);
        setPatientId(row.id);
    };

    const closeResults = () => {
        setResultsOpen(false);
        setTimeout(() => {
            setResultsOrder(null);
            setPatientId(null);
        }, 200);
    };

    const collectSample = (row: QueuePatient) => {
        Notiflix.Confirm.show(
            'Collect Sample',
            `Collect sample for ${row.first_name} ${row.last_name}?`,
            'Confirm',
            'Cancel',
            () => {
                router.post(
                    `/laboratory/samples/${row.id}/collect`,
                    {},
                    {
                        onSuccess: () => {
                            Notiflix.Notify.success('Sample collected');
                            router.reload();
                        },
                        onError: () =>
                            Notiflix.Notify.failure('Failed to collect sample'),
                    },
                );
            },
        );
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
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
    ];

    const actions: Action<QueuePatient>[] = [
        {
            label: 'Upload Results',
            icon: <FileUp size={16} />,
            color: 'success',
            onClick: (row) => openResults(row),
        },
        {
            label: 'View Order',
            icon: <Receipt size={16} />,
            color: 'info',
            onClick: (row) => openDetails(row),
        },
        {
            label: 'Collect Sample',
            icon: <FlaskConical size={16} />,
            color: 'success',
            show: (row) => row.status === 'active' || row.status === 'pending',
            onClick: (row) => collectSample(row),
        },
    ];

    const statusOptions = [
        { value: 'active', label: 'In Queue' },
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Laboratory' },
                { href: '', title: 'Queue' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <PageHeader
                    icon={<Microscope className="h-5 w-5" />}
                    title="Laboratory Department"
                    subtitle="Manage patient queue, samples, and laboratory workflow"
                />

                <ReusableTable
                    title="Patient Queue"
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
                    defaultOrderDirection="asc"
                    emptyMessage="No patients in the queue"
                    className="shadow-sm"
                />
            </div>

            <OrderDetailDrawer
                order={selectedOrder}
                isOpen={drawerOpen}
                onClose={closeDetails}
            />

            <UploadResultModal
                open={resultsOpen}
                order={resultsOrder}
                onCancel={closeResults}
                onSaved={() => {
                    closeResults();
                    router.reload({ only: ['queue'] });
                }}
                auth={props.auth}
                patientId={patientId}
            />
        </AppLayout>
    );
}

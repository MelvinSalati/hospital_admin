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
    Upload,
    FileText,
    FilePlus2,
    FileUp,
    Building2,
    LayoutDashboard,
    Clock,
    Hash,
    User,
    Stethoscope,
    Ruler,
    ShieldAlert,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { FC } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import Http from '@/utils/Http';

// ============ TYPES ============
interface LabTest {
    item_id?: number | null;
    invoice_id?: number | null;
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
    invoice_id?: number | null;
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
    photo_url?: string | null;
    /** true once results are uploaded and parsed (sent by LaboratoryController@laboratoryQueue) */
    processed?: boolean;
    tests: LabTest[];
}

interface Props {
    queue: QueuePatient[];
}

type QueueTab = 'in_queue' | 'completed';

/**
 * Completed tab: orders that are processed (backend `processed` flag).
 * Falls back to status when the flag is missing. Everything else is In Progress.
 */
const isProcessed = (row: QueuePatient): boolean =>
    row.processed ??
    ['completed', 'cancelled'].includes((row.status || '').toLowerCase());

const createdAt = (row: QueuePatient): number => {
    const t = new Date((row.created_at || '').replace(' ', 'T')).getTime();
    return Number.isNaN(t) ? 0 : t;
};

// ============ ILLUSTRATED AVATARS (DiceBear) ============
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
    patientId: number,
    gender: string | null | undefined,
    pixels: number,
): string => {
    const g = (gender || '').toLowerCase();
    const isMale = g === 'male';
    const isFemale = g === 'female';

    const params = new URLSearchParams({
        seed: `patient-${patientId}`,
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

const PatientAvatar: FC<{
    name: string;
    patientId?: number;
    gender?: string | null;
    photoUrl?: string | null;
    size?: 'sm' | 'lg';
}> = ({ name, patientId, gender, photoUrl, size = 'sm' }) => {
    const [failed, setFailed] = useState(false);

    const dimension = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
    const pixels = size === 'lg' ? 96 : 72;

    const src =
        photoUrl ||
        (patientId !== undefined
            ? getAvatarUrl(patientId, gender, pixels)
            : null);

    const initials = (name || '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (!src || failed) {
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
            src={src}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`${dimension} shrink-0 rounded-full bg-blue-100 object-cover dark:bg-blue-900/40`}
        />
    );
};

// ============ HELPERS ============
const formatMoney = (n: number | string) =>
    `ZMW ${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return '—';
    const d = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/** "M/34" → "male", "F/8" → "female", anything else → null. */
const genderFromSexAge = (value: string | null | undefined): string | null => {
    const first = (value || '').trim().charAt(0).toUpperCase();

    if (first === 'M') return 'male';
    if (first === 'F') return 'female';

    return null;
};

const capitalize = (value: string): string =>
    value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';

const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        active: {
            label: 'In Queue',
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            dot: 'bg-blue-500',
        },
        pending: {
            label: 'Pending',
            badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            dot: 'bg-amber-500',
        },
        accepted: {
            label: 'Accepted — Awaiting Payment',
            badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            dot: 'bg-purple-500',
        },
        completed: {
            label: 'Completed',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            dot: 'bg-emerald-500',
        },
        cancelled: {
            label: 'Cancelled',
            badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            dot: 'bg-slate-500',
        },
    };
    return map[status] ?? map.pending;
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
    const cfg = getStatusConfig(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const TestStatusBadge: FC<{ status: string }> = ({ status }) => (
    <span
        className={cn(
            'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium capitalize',
            status === 'completed'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        )}
    >
        {status}
    </span>
);

/** Colour-codes a result interpretation (normal / high / low / abnormal / critical…). */
const interpretationClass = (value: string): string => {
    const v = value.toLowerCase();

    if (v.includes('critical'))
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (
        v.includes('high') ||
        v.includes('low') ||
        v.includes('abnormal') ||
        v.includes('positive') ||
        v.includes('reactive')
    )
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (
        v.includes('normal') ||
        v.includes('negative') ||
        v.includes('non-reactive')
    )
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const InfoCell: FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}> = ({ icon, label, value, mono }) => (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            {icon}
            {label}
        </div>
        <div
            className={cn(
                'mt-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200',
                mono && 'font-mono',
            )}
        >
            {value || '—'}
        </div>
    </div>
);

// ============ REMOVE TEST CONFIRMATION ============
function RemoveTestDialog({
    open,
    order,
    test,
    onCancel,
    onConfirm,
    busy,
    error,
    reason,
    onReasonChange,
}: {
    open: boolean;
    order: QueuePatient | null;
    test: LabTest | null;
    onCancel: () => void;
    onConfirm: () => void;
    busy: boolean;
    error: string | null;
    reason: string;
    onReasonChange: (v: string) => void;
}) {
    if (!open || !test) return null;

    const allTests = order?.tests ?? [];
    const currentTotal = allTests.reduce(
        (s, t) => s + Number(t.amount ?? 0),
        0,
    );
    const testAmount = Number(test.amount ?? test.total_price ?? 0);
    const newTotal = Math.max(0, currentTotal - testAmount);
    const remaining = Math.max(0, allTests.length - 1);
    const hasResult =
        test.status === 'completed' ||
        !!test.result_value ||
        !!test.result_file;
    const fullName = order ? `${order.first_name} ${order.last_name}` : '';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Remove Test
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Remove a test from this lab order
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {/* Patient / order strip */}
                    {order && (
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                            <PatientAvatar
                                name={fullName}
                                patientId={order.id}
                                gender={genderFromSexAge(order.gender)}
                                photoUrl={order.photo_url}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {fullName}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                    <span className="font-mono">
                                        AMH-{order.token}
                                    </span>
                                    {order.patient_number && (
                                        <> · EMR #{order.patient_number}</>
                                    )}
                                    {order.lab_order_id && (
                                        <> · Order #{order.lab_order_id}</>
                                    )}
                                </p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>
                    )}

                    {/* Test being removed */}
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-red-600 uppercase dark:text-red-400">
                            <Trash2 size={11} />
                            Test to be removed
                        </p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {test.test_name}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                    <span>Qty {test.quantity}</span>
                                    <span>×</span>
                                    <span className="font-mono">
                                        {formatMoney(test.unit_price)}
                                    </span>
                                    <TestStatusBadge status={test.status} />
                                </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                                {formatMoney(testAmount)}
                            </span>
                        </div>
                    </div>

                    {/* Impact on order */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                            Impact on order
                        </p>
                        <dl className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">
                                    Current total ({allTests.length} test
                                    {allTests.length === 1 ? '' : 's'})
                                </dt>
                                <dd className="font-mono text-slate-700 dark:text-slate-300">
                                    {formatMoney(currentTotal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">
                                    Less: {test.test_name}
                                </dt>
                                <dd className="font-mono text-red-600 dark:text-red-400">
                                    − {formatMoney(testAmount)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
                                <dt className="font-medium text-slate-700 dark:text-slate-300">
                                    New total ({remaining} test
                                    {remaining === 1 ? '' : 's'})
                                </dt>
                                <dd className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {formatMoney(newTotal)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Warnings */}
                    {(hasResult || remaining === 0) && (
                        <div className="space-y-2">
                            {hasResult && (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                                    <AlertTriangle
                                        size={14}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                        This test already has a result recorded.
                                        Removing it will discard that result
                                        from this order.
                                    </span>
                                </div>
                            )}
                            {remaining === 0 && (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                                    <AlertTriangle
                                        size={14}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                        This is the only test on the order. The
                                        order will be left empty.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason (optional, saved in the audit log) */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Reason{' '}
                            <span className="font-normal text-slate-400">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            maxLength={500}
                            rows={2}
                            disabled={busy}
                            placeholder="Why is this test being removed?"
                            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </div>

                    {/* Server error */}
                    {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                            <AlertTriangle
                                size={14}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        <Trash2 size={12} />
                        {busy ? 'Removing…' : 'Confirm & Remove'}
                    </button>
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
            await Http.post(
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
    const fullName = `${order.first_name} ${order.last_name}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex h-[65vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <PatientAvatar
                            name={fullName}
                            patientId={order.id}
                            gender={genderFromSexAge(order.gender)}
                            photoUrl={order.photo_url}
                            size="lg"
                        />
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                Upload Results
                            </h3>
                            <p className="text-sm text-slate-500">
                                {fullName} ·{' '}
                                <span className="font-mono">{order.token}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body — two columns, each scrolls independently */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-2">
                    {/* LEFT — files */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Result PDFs{' '}
                                <span className="text-slate-400">
                                    ({files.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                            >
                                <FileUp size={14} /> Add
                            </button>
                        </div>

                        <label
                            htmlFor="result-pdfs"
                            className={cn(
                                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center',
                                errors.pdf || errors.pdfs
                                    ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-700',
                            )}
                        >
                            <FileUp size={28} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <FileText
                                        size={18}
                                        className="shrink-0 text-red-500"
                                    />
                                    <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
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
                                <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                                    No files added yet
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* RIGHT — tests */}
                    <div className="flex min-h-0 flex-col">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Tests covered{' '}
                                <span className="text-slate-400">
                                    ({selected.length}/{tests.length})
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                                {allSelected ? 'Clear all' : 'Select all'}
                            </button>
                        </div>

                        <ul
                            className={cn(
                                'min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border p-2',
                                errors.tests
                                    ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
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
                                                    ? 'bg-blue-100 dark:bg-blue-900/30'
                                                    : 'hover:bg-white dark:hover:bg-slate-800',
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
                                            <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-200">
                                                {t.test_name}
                                            </span>
                                            <TestStatusBadge
                                                status={t.status}
                                            />
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
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {files.length}
                        </span>{' '}
                        file(s) ·{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {selected.length}
                        </span>{' '}
                        test(s) selected
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            disabled={saving}
                            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
    const [removeError, setRemoveError] = useState<string | null>(null);
    const [removeReason, setRemoveReason] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [infoOpen, setInfoOpen] = useState(true);

    const tests = order?.tests ?? [];
    const overallTotal = useMemo(
        () => tests.reduce((s, t) => s + Number(t.amount ?? 0), 0),
        [tests],
    );
    const totalQuantity = useMemo(
        () => tests.reduce((s, t) => s + Number(t.quantity ?? 0), 0),
        [tests],
    );
    const alreadyAccepted = order?.status === 'accepted';

    const askRemove = (testName: string) => {
        setRemoveError(null);
        setRemoveReason('');
        setPendingRemove(testName);
        setPromptOpen(true);
    };

    const closePrompt = () => {
        setPromptOpen(false);
        setPendingRemove(null);
        setRemoveError(null);
        setRemoveReason('');
    };

    // POST patients/{patientId}/remove/item/{invoiceId}
    const removeTest = async () => {
        if (!order || !pendingRemove || removing) return;

        const test = tests.find((t) => t.test_name === pendingRemove);
        if (!test) return;

        // {invoiceId} in the route is the INVOICE id.
        const invoiceId = test.invoice_id ?? order.invoice_id;
        if (!invoiceId) {
            setRemoveError('Missing invoice id for this order.');
            return;
        }

        setRemoving(pendingRemove);
        setRemoveError(null);

        try {
            await Http.post(`patients/${order.id}/remove/item/${invoiceId}`, {
                kind: 'laboratory',
                service_name: test.test_name,
                // id: test.item_id, // only if InvoiceService::removeItem expects the lab_order_items id
                ...(removeReason.trim() ? { reason: removeReason.trim() } : {}),
            });

            Notiflix.Notify.success(`"${test.test_name}" removed`);
            closePrompt();
            router.reload({ only: ['queue'] });
        } catch (err: any) {
            const errors = err?.response?.data?.errors ?? {};
            const firstError = Object.values(errors)[0] as
                | string[]
                | string
                | undefined;
            const msg =
                (Array.isArray(firstError) ? firstError[0] : firstError) ??
                err?.response?.data?.message ??
                'Failed to remove the test. Please try again.';
            setRemoveError(msg);
            Notiflix.Notify.failure(msg);
        } finally {
            setRemoving(null);
        }
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

    const fullName = `${order.first_name} ${order.last_name}`;

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
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl transition-transform dark:bg-slate-800',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Lab Order Details
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                AMH-{order.token}
                                {order.lab_order_id
                                    ? ` · Order #${order.lab_order_id}`
                                    : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Patient header */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <PatientAvatar
                        name={fullName}
                        patientId={order.id}
                        gender={genderFromSexAge(order.gender)}
                        photoUrl={order.photo_url}
                        size="lg"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 capitalize">
                            {order.gender || '—'} · {order.ordered_by || '—'}
                        </p>
                    </div>
                    <StatusBadge status={order.status} />
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                    {/* Order & patient info */}
                    <section>
                        <button
                            type="button"
                            onClick={() => setInfoOpen((v) => !v)}
                            aria-expanded={infoOpen}
                            className="mb-2 flex w-full items-center justify-between rounded-md py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
                        >
                            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                Order Information
                            </span>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    'text-slate-400 transition-transform',
                                    infoOpen ? 'rotate-180' : 'rotate-0',
                                )}
                            />
                        </button>
                        {infoOpen && (
                            <div className="grid grid-cols-2 gap-2">
                                <InfoCell
                                    icon={<Hash size={11} />}
                                    label="EMR Number"
                                    value={order.patient_number}
                                    mono
                                />
                                <InfoCell
                                    icon={<User size={11} />}
                                    label="Sex / Age"
                                    value={order.gender}
                                />
                                <InfoCell
                                    icon={<Hash size={11} />}
                                    label="Visit Token"
                                    value={order.visit_token}
                                    mono
                                />
                                <InfoCell
                                    icon={<Hash size={11} />}
                                    label="Lab Order ID"
                                    value={
                                        order.lab_order_id
                                            ? `#${order.lab_order_id}`
                                            : null
                                    }
                                    mono
                                />
                                <InfoCell
                                    icon={<Building2 size={11} />}
                                    label="Ordered By"
                                    value={
                                        <span className="capitalize">
                                            {order.ordered_by}
                                        </span>
                                    }
                                />
                                <InfoCell
                                    icon={<Clock size={11} />}
                                    label="Ordered On"
                                    value={formatDateTime(order.created_at)}
                                />
                            </div>
                        )}
                    </section>

                    {/* Tests */}
                    <section>
                        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Ordered Tests ({tests.length})
                        </h3>

                        <ul className="space-y-2">
                            {tests.map((t, idx) => {
                                const hasResult =
                                    !!t.result_value ||
                                    !!t.reference_range ||
                                    !!t.interpretation ||
                                    !!t.result_file;

                                return (
                                    <li
                                        key={`${t.test_name}-${idx}`}
                                        className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-50 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {idx + 1}
                                                    </span>
                                                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                        {t.test_name}
                                                    </p>
                                                    <TestStatusBadge
                                                        status={t.status}
                                                    />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-[11px] text-slate-500">
                                                    <span>
                                                        Qty {t.quantity}
                                                    </span>
                                                    <span>×</span>
                                                    <span className="font-mono">
                                                        {formatMoney(
                                                            t.unit_price,
                                                        )}
                                                    </span>
                                                    <span>=</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {formatMoney(
                                                            t.amount ??
                                                                t.total_price,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    askRemove(t.test_name)
                                                }
                                                disabled={
                                                    removing === t.test_name
                                                }
                                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                title="Remove test"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Result details */}
                                        <div className="mt-3 ml-7 rounded-md border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                                            {hasResult ? (
                                                <>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="min-w-0">
                                                            <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                                                                <Stethoscope
                                                                    size={10}
                                                                />
                                                                Result
                                                            </p>
                                                            <p className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                                {t.result_value ??
                                                                    '—'}
                                                                {t.unit && (
                                                                    <span className="ml-1 font-normal text-slate-500">
                                                                        {t.unit}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                                                                <Ruler
                                                                    size={10}
                                                                />
                                                                Reference
                                                            </p>
                                                            <p className="mt-0.5 truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                                                                {t.reference_range ??
                                                                    '—'}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                                                                Interpretation
                                                            </p>
                                                            <div className="mt-0.5">
                                                                {t.interpretation ? (
                                                                    <span
                                                                        className={cn(
                                                                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                                                            interpretationClass(
                                                                                t.interpretation,
                                                                            ),
                                                                        )}
                                                                    >
                                                                        {
                                                                            t.interpretation
                                                                        }
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {t.result_file && (
                                                        <a
                                                            href={t.result_file}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                        >
                                                            <FileText
                                                                size={11}
                                                            />{' '}
                                                            View result PDF
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-[11px] text-slate-400 italic">
                                                    Awaiting result
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}

                            {tests.length === 0 && (
                                <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                                    No tests on this order
                                </li>
                            )}
                        </ul>
                    </section>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>
                                Subtotal ({tests.length} test
                                {tests.length === 1 ? '' : 's'} ·{' '}
                                {totalQuantity} unit
                                {totalQuantity === 1 ? '' : 's'})
                            </span>
                            <span className="font-mono">
                                {formatMoney(overallTotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                Total
                            </span>
                            <span className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400">
                                {formatMoney(overallTotal)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={openInvoice}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Close
                    </button>
                </footer>
            </aside>

            <RemoveTestDialog
                open={promptOpen}
                order={order}
                test={tests.find((t) => t.test_name === pendingRemove) ?? null}
                busy={removing !== null}
                error={removeError}
                reason={removeReason}
                onReasonChange={setRemoveReason}
                onCancel={closePrompt}
                onConfirm={removeTest}
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
    const [activeTab, setActiveTab] = useState<QueueTab>('in_queue');

    // Keep the open drawer in sync after `router.reload({ only: ['queue'] })`
    // so a removed test disappears from the drawer straight away.
    useEffect(() => {
        if (!selectedOrder?.lab_order_id) return;
        const fresh = queues.find(
            (q) => q.lab_order_id === selectedOrder.lab_order_id,
        );
        if (fresh) setSelectedOrder(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.queue]);

    // In Progress: oldest first. Completed: most recent first.
    const inQueue = useMemo(
        () =>
            queues
                .filter((q) => !isProcessed(q))
                .sort((a, b) => createdAt(a) - createdAt(b)),
        [queues],
    );

    const completed = useMemo(
        () =>
            queues
                .filter((q) => isProcessed(q))
                .sort((a, b) => createdAt(b) - createdAt(a)),
        [queues],
    );

    const tableData = activeTab === 'in_queue' ? inQueue : completed;

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

    const columns: Column<QueuePatient>[] = [
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    AMH-{value}
                </span>
            ),
        },
        {
            id: 'first_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => {
                const fullName = `${row.first_name} ${row.last_name}`;
                return (
                    <div className="flex items-center gap-2.5">
                        <PatientAvatar
                            name={fullName}
                            patientId={row.id}
                            gender={genderFromSexAge(row.gender)}
                            photoUrl={row.photo_url}
                        />
                        <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                {fullName}
                            </span>
                            {row.patient_number && (
                                <div className="text-xs text-slate-400">
                                    EMR #: {row.patient_number}
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'gender',
            label: 'Sex/Age',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600 dark:text-slate-400">
                    {value ? capitalize(value) : '—'}
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
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
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
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
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
            format: (value) => <StatusBadge status={value} />,
        },
        {
            id: 'ordered_by',
            label: 'Ordered By',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-1.5 text-sm text-slate-700 capitalize dark:text-slate-300">
                    <Building2 size={14} className="text-slate-400" />
                    {value || '—'}
                </div>
            ),
        },
    ];

    const actions: Action<QueuePatient>[] = [
        ...(activeTab === 'completed'
            ? [
                  {
                      label: 'View Dashboard',
                      icon: <LayoutDashboard size={16} />,
                      color: 'primary',
                      show: (row: QueuePatient) => !!row.id,
                      onClick: (row: QueuePatient) =>
                          router.visit(`/patients/dashboard/${row.id}`),
                  } as Action<QueuePatient>,
              ]
            : []),
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
            <PageHeader
                icon={<Microscope className="h-5 w-5" />}
                title="Laboratory Department"
                subtitle="Manage patient queue, samples, and laboratory workflow"
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
                    filterPlaceholder="Search by name or token..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="created_at"
                    defaultOrderDirection={
                        activeTab === 'in_queue' ? 'asc' : 'desc'
                    }
                    emptyMessage={
                        activeTab === 'in_queue'
                            ? 'No lab orders in progress'
                            : 'No completed lab orders found'
                    }
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

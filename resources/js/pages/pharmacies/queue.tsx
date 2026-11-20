// pages/pharmacies/queue.tsx
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    LayoutDashboard,
    ListChecks,
    PillBottleIcon,
    ShieldAlert,
    Trash2,
    X,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState, useMemo } from 'react';
import type { FC } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import Http from '@/utils/Http';

// ============ TYPES ============
interface RxItem {
    id: number;
    drug_name: string;
    dosage: string | null;
    dosage_unit: string | null;
    frequency: string | null;
    route: string | null;
    duration: string | null;
    duration_unit: string | null;
    instructions: string | null;
    quantity_prescribed: number;
    quantity_dispensed: number;
    quantity_remaining: number;
    dispensation_status: string;
}

// Rows in the "Prescriptions" tab come from queuePrescriptions() (snake_case ids).
// Rows in the "Dispensed" tab come from dispensedTransactions() (camelCase ids,
// no item_count / pending_count). Both shapes are covered here.
interface RxRow {
    id: number;
    token: string | null;
    rx_number: string;
    patient_name?: string;
    patientName?: string;
    patient_id?: number;
    patientId?: number;
    /** invoice for this prescription (needed to remove items) */
    invoice_id?: number | null;
    patientGender?: string | null;
    gender?: string | null;
    photo_url?: string | null;
    created_at: string | null;
    status: string;
    item_count?: number;
    pending_count?: number;
    items: RxItem[];
}

interface AuthUser {
    id: number;
    name: string;
    email?: string;
    profile?: {
        department_id?: number | string;
    };
}

interface Props {
    prescriptions: RxRow[];
    dispensed: RxRow[];
    auth: { user: AuthUser };
    [key: string]: unknown;
}

type QueueTab = 'in_queue' | 'completed';

const formatDate = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '—';

const createdAt = (rx: RxRow) =>
    rx.created_at ? new Date(rx.created_at).getTime() : 0;

// A prescription is processed once nothing is left to dispense
const isProcessed = (rx: RxRow) => rx.pending_count === 0;

// Works for both row shapes (queue rows and dispensed rows)
const getPatientId = (rx: RxRow): number | undefined =>
    rx.patient_id ?? rx.patientId;

// `kind` sent to POST patients/{patientId}/remove/item/{invoiceId}.
// The lab page sends 'laboratory'; change this if your InvoiceService expects a different value for pharmacy.
const REMOVE_ITEM_KIND = 'prescription';

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

/** "M/34", "male", "F" → "male" / "female", anything else → null. */
const genderFromSexAge = (value: string | null | undefined): string | null => {
    const first = (value || '').trim().charAt(0).toUpperCase();

    if (first === 'M') return 'male';
    if (first === 'F') return 'female';

    return null;
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

// ============ REMOVE ITEM CONFIRMATION ============
function RemoveItemDialog({
    open,
    rx,
    item,
    busy,
    error,
    reason,
    onReasonChange,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    rx: RxRow | null;
    item: RxItem | null;
    busy: boolean;
    error: string | null;
    reason: string;
    onReasonChange: (v: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (!open || !item || !rx) return null;

    const remaining = Math.max(0, (rx.items?.length ?? 0) - 1);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Remove Item
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Remove a drug from {rx.rx_number}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-red-600 uppercase">
                            <Trash2 size={11} />
                            Item to be removed
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                            {item.drug_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            Prescribed: {item.quantity_prescribed ?? 0}
                        </p>
                    </div>

                    {remaining === 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                            <AlertTriangle
                                size={14}
                                className="mt-0.5 shrink-0"
                            />
                            <span>
                                This is the only item on the prescription. The
                                prescription will be left empty.
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                            placeholder="Why is this item being removed?"
                            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:opacity-60"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
                            <AlertTriangle
                                size={14}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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

// ============ ORDER ITEMS DRAWER (view + remove) ============
function OrderItemsDrawer({
    rx,
    canRemove,
    onClose,
}: {
    rx: RxRow | null;
    canRemove: boolean;
    onClose: () => void;
}) {
    const [pendingId, setPendingId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    if (!rx) return null;

    const items = rx.items ?? [];
    const patientName = rx.patientName ?? rx.patient_name ?? '';
    const pendingItem = items.find((i) => i.id === pendingId) ?? null;

    const askRemove = (itemId: number) => {
        setError(null);
        setReason('');
        setPendingId(itemId);
    };

    const closePrompt = () => {
        setPendingId(null);
        setError(null);
        setReason('');
    };

    // POST patients/{patientId}/remove/item/{invoiceId}
    const removeItem = async () => {
        if (!pendingItem || busy) return;

        const patientId = getPatientId(rx);
        const invoiceId = rx.invoice_id;

        if (!patientId) {
            setError('This prescription has no patient attached.');
            return;
        }
        if (!invoiceId) {
            setError('Missing invoice id for this prescription.');
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await Http.post(`patients/${patientId}/remove/item/${invoiceId}`, {
                kind: REMOVE_ITEM_KIND,
                service_name: pendingItem.drug_name,
                prescription_id: rx.id,
                prescription_item_id: pendingItem.id,
                ...(reason.trim() ? { reason: reason.trim() } : {}),
            });

            Notiflix.Notify.success(`"${pendingItem.drug_name}" removed`);
            closePrompt();
            router.reload({ only: ['prescriptions'] });
        } catch (err: any) {
            const errors = err?.response?.data?.errors ?? {};
            const first = Object.values(errors)[0] as
                | string[]
                | string
                | undefined;
            const msg =
                (Array.isArray(first) ? first[0] : first) ??
                err?.response?.data?.message ??
                'Failed to remove the item. Please try again.';
            setError(msg);
            Notiflix.Notify.failure(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-slate-900/40"
                onClick={onClose}
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Prescription · {rx.rx_number}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {patientName}
                            {rx.token ? ` · ${rx.token}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        Items ({items.length})
                    </h3>
                    <ul className="space-y-2">
                        {items.map((item, idx) => {
                            const dispensed = Number(
                                item.quantity_dispensed ?? 0,
                            );
                            const locked = dispensed > 0;

                            return (
                                <li
                                    key={item.id ?? idx}
                                    className="rounded-lg border border-slate-200 p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {idx + 1}. {item.drug_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {[item.dosage, item.dosage_unit]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                {item.frequency &&
                                                    ` · ${item.frequency}`}
                                                {item.route &&
                                                    ` · ${item.route}`}
                                                {item.duration &&
                                                    ` · ${item.duration} ${item.duration_unit ?? ''}`}
                                            </p>
                                            {item.instructions && (
                                                <p className="mt-1 text-xs text-slate-600 italic">
                                                    {item.instructions}
                                                </p>
                                            )}
                                        </div>

                                        {canRemove && (
                                            <button
                                                onClick={() =>
                                                    askRemove(item.id)
                                                }
                                                disabled={locked || busy}
                                                title={
                                                    locked
                                                        ? 'Already dispensed — cannot be removed'
                                                        : 'Remove item'
                                                }
                                                className={cn(
                                                    'rounded p-1 text-slate-400 disabled:opacity-40',
                                                    !locked &&
                                                        'hover:bg-red-50 hover:text-red-600',
                                                )}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                        <span>
                                            Prescribed:{' '}
                                            <strong>
                                                {item.quantity_prescribed ?? 0}
                                            </strong>
                                        </span>
                                        <span>
                                            Dispensed:{' '}
                                            <strong>{dispensed}</strong>
                                        </span>
                                        {item.quantity_remaining !==
                                            undefined && (
                                            <span>
                                                Remaining:{' '}
                                                <strong className="text-amber-700">
                                                    {item.quantity_remaining}
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        {items.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                No items on this prescription.
                            </li>
                        )}
                    </ul>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50 p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
                    >
                        Close
                    </button>
                </footer>
            </aside>

            <RemoveItemDialog
                open={pendingId !== null}
                rx={rx}
                item={pendingItem}
                busy={busy}
                error={error}
                reason={reason}
                onReasonChange={setReason}
                onCancel={closePrompt}
                onConfirm={removeItem}
            />
        </>
    );
}

// ============ PAGE ============
export default function Queue() {
    const { props } = usePage<Props>();
    const rows = props.prescriptions ?? [];
    const dispensedRows = props.dispensed ?? [];
    const userId = props.auth.user.id;

    // In Queue: oldest first. Dispensed: most recent first.
    const inQueue = useMemo(
        () =>
            rows
                .filter((q) => !isProcessed(q))
                .sort((a, b) => createdAt(a) - createdAt(b)),
        [rows],
    );

    const completed = useMemo(
        () =>
            rows
                .filter((q) => isProcessed(q))
                .sort((a, b) => createdAt(b) - createdAt(a)),
        [rows],
    );

    const [activeTab, setActiveTab] = useState<QueueTab>('in_queue');
    const [active, setActive] = useState<RxRow | null>(null);
    const [orderView, setOrderView] = useState<RxRow | null>(null);

    // Keep the open drawer in sync after `router.reload({ only: ['prescriptions'] })`
    // so a removed item disappears straight away (and the drawer closes if the order is gone).
    useEffect(() => {
        if (!orderView) return;
        const fresh = rows.find((r) => r.id === orderView.id);
        if (fresh) setOrderView(fresh);
        else if (activeTab === 'in_queue') setOrderView(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.prescriptions]);

    const columns: Column<RxRow>[] = [
        {
            id: 'rx_number',
            label: 'Rx #',
            sortable: true,
            filterable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-slate-800">
                    {value}
                </span>
            ),
        },
        {
            id: 'patientName',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2.5">
                    <PatientAvatar
                        name={String(value ?? '')}
                        patientId={getPatientId(row)}
                        gender={genderFromSexAge(
                            row.patientGender ?? row.gender,
                        )}
                        photoUrl={row.photo_url}
                    />
                    <span className="text-sm font-medium text-slate-800">
                        {value}
                    </span>
                </div>
            ),
        },
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            filterable: true,
            format: (value) => (
                <span className="font-mono text-xs text-slate-500">
                    {value ?? '—'}
                </span>
            ),
        },
        {
            id: 'created_at',
            label: 'Prescription and Dispensation',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-500">
                    {formatDate(value)}
                </span>
            ),
        },
        {
            id: 'items',
            label: 'Items',
            sortable: true,
            format: (value, row) => {
                const count = Array.isArray(value) ? value.length : 0;

                // Dispensed rows have no item_count, so just show the item total
                if (row.item_count === undefined) {
                    return (
                        <span className="text-xs text-slate-600">
                            <span className="font-semibold text-emerald-700">
                                {count}
                            </span>{' '}
                            {count === 1 ? 'item' : 'items'}
                        </span>
                    );
                }

                return (
                    <span className="text-xs text-slate-600">
                        <span className="font-semibold text-amber-700">
                            {count}
                        </span>{' '}
                        / {row.item_count} pending
                    </span>
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
                partially_dispensed: 'info',
                dispensed: 'success',
                completed: 'success',
                cancelled: 'error',
            },
            format: (value) => (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 capitalize">
                    {String(value ?? '').replace(/_/g, ' ')}
                </span>
            ),
        },
    ];

    const actions: Action<RxRow>[] = [
        ...(activeTab === 'completed'
            ? [
                  {
                      label: 'View Dashboard',
                      icon: <LayoutDashboard size={16} />,
                      color: 'primary',
                      show: (row: RxRow) => !!getPatientId(row),
                      onClick: (row: RxRow) =>
                          router.visit(
                              `/patients/dashboard/${getPatientId(row)}`,
                          ),
                  } as Action<RxRow>,
              ]
            : []),
        {
            label:
                activeTab === 'in_queue' ? 'View / Remove Items' : 'View Items',
            icon: <ListChecks size={16} />,
            color: 'info',
            onClick: (row) => setOrderView(row),
        },
        {
            label: 'Dispense',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => {
                const patientId = getPatientId(row);

                if (!patientId) {
                    Notiflix.Notify.warning(
                        'This prescription has no patient attached.',
                    );
                    return;
                }
                router.visit(`/patients/pharmacy/dispense/${patientId}`);
            },
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Pharmacy' },
                { href: '', title: 'Queue' },
            ]}
        >
            <PageHeader
                icon={<PillBottleIcon className="h-5 w-5" />}
                title="Pharmacy Encounters Queue"
                subtitle="Prescriptions awaiting dispensation"
                actions={[
                    {
                        label: `Prescriptions (${rows.length})`,
                        onClick: () => setActiveTab('in_queue'),
                        variant: activeTab === 'in_queue' ? 'cyan' : 'default',
                    },
                    {
                        label: `Dispensed (${dispensedRows.length})`,
                        onClick: () => setActiveTab('completed'),
                        variant: activeTab === 'completed' ? 'cyan' : 'default',
                    },
                ]}
            />

            <div className="h-full">
                <div className="overflow-hidden rounded-xl bg-blue-50 p-4">
                    <ReusableTable
                        columns={columns}
                        data={activeTab === 'in_queue' ? rows : dispensedRows}
                        actions={actions}
                        loading={false}
                        filterPlaceholder="Search prescriptions..."
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        emptyMessage={
                            activeTab === 'in_queue'
                                ? 'No prescriptions awaiting dispensation.'
                                : 'No dispensed prescriptions yet.'
                        }
                        className="shadow-sm"
                    />
                </div>
            </div>

            <OrderItemsDrawer
                rx={orderView}
                canRemove={activeTab === 'in_queue'}
                onClose={() => setOrderView(null)}
            />

            <DispenseDrawer
                rx={active}
                onClose={() => setActive(null)}
                userId={userId}
                departmentId={props.auth.user.profile?.department_id}
            />
        </AppLayout>
    );
}

// ============ DRAWER ============
function DispenseDrawer({
    rx,
    onClose,
    userId,
    departmentId,
}: {
    rx: RxRow | null;
    onClose: () => void;
    userId: number;
    departmentId?: number | string;
}) {
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [saving, setSaving] = useState(false);

    // Reset inputs whenever the drawer opens for a new prescription
    useEffect(() => {
        if (!rx) return;
        const init: Record<number, number> = {};
        rx.items.forEach((i) => {
            init[i.id] = 0;
        });
        setQuantities(init);
    }, [rx?.id]);

    if (!rx) return null;

    const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

    const setQty = (itemId: number, val: string) => {
        const n = Number(val);
        setQuantities((q) => ({ ...q, [itemId]: Number.isFinite(n) ? n : 0 }));
    };

    const fillRemaining = (item: RxItem) => {
        setQuantities((q) => ({ ...q, [item.id]: item.quantity_remaining }));
    };

    const submit = async () => {
        const items = Object.entries(quantities)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => {
                const item = rx.items.find((i) => i.id === Number(id));
                if (!item) return null;

                return {
                    drug_id: item.id,
                    quantity_dispensed: qty,
                    drug_name: item.drug_name,
                    prescription_number: rx.rx_number,
                    dispensed_by: userId,
                    quantity_prescribed: item.quantity_prescribed,
                };
            })
            .filter(Boolean) as {
            drug_id: number;
            quantity_dispensed: number;
            drug_name: string;
            prescription_number: string;
            dispensed_by: number;
            quantity_prescribed: number;
        }[];

        if (items.length === 0) {
            Notiflix.Notify.warning('Enter at least one quantity to dispense.');
            return;
        }

        setSaving(true);
        try {
            await Http.post(`/pharmacy/prescriptions/${rx.id}/dispense`, {
                items,
                department_id: departmentId,
                userId: userId,
            });
            Notiflix.Notify.success(`Dispensed ${items.length} item(s).`);
            router.reload({ only: ['prescriptions'] });
            onClose();
        } catch (err: any) {
            const msg =
                err?.response?.data?.errors?.items?.[0] ??
                err?.response?.data?.message ??
                'Dispense failed';
            Notiflix.Notify.failure(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-slate-900/40"
                onClick={onClose}
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Dispense · {rx.rx_number}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {rx.patientName ?? rx.patient_name}
                            {rx.token ? ` · ${rx.token}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-3">
                        {rx.items.map((item) => {
                            const remaining = item.quantity_remaining;
                            const disabled =
                                remaining <= 0 ||
                                item.dispensation_status === 'dispensed';

                            return (
                                <li
                                    key={item.id}
                                    className="rounded-lg border border-slate-200 p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {item.drug_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {[item.dosage, item.dosage_unit]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                {item.frequency &&
                                                    ` · ${item.frequency}`}
                                                {item.route &&
                                                    ` · ${item.route}`}
                                                {item.duration &&
                                                    ` · ${item.duration} ${item.duration_unit ?? ''}`}
                                            </p>
                                            {item.instructions && (
                                                <p className="mt-1 text-xs text-slate-600 italic">
                                                    {item.instructions}
                                                </p>
                                            )}
                                        </div>
                                        {disabled && (
                                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                                                Done
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                        <span>
                                            Prescribed:{' '}
                                            <strong>
                                                {item.quantity_prescribed}
                                            </strong>
                                        </span>
                                        <span>
                                            Dispensed:{' '}
                                            <strong>
                                                {item.quantity_dispensed}
                                            </strong>
                                        </span>
                                        <span>
                                            Remaining:{' '}
                                            <strong className="text-amber-700">
                                                {remaining}
                                            </strong>
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                        <label className="text-xs font-medium text-slate-700">
                                            Dispense now
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={remaining}
                                            step="any"
                                            disabled={disabled}
                                            value={quantities[item.id] ?? 0}
                                            onChange={(e) =>
                                                setQty(item.id, e.target.value)
                                            }
                                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                                        />
                                        {!disabled && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    fillRemaining(item)
                                                }
                                                className="text-xs font-medium text-blue-600 hover:underline"
                                            >
                                                Fill remaining ({remaining})
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        {rx.items.length === 0 && (
                            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                                No items on this prescription.
                            </li>
                        )}
                    </ul>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                            <strong>{totalQty}</strong> unit(s) to dispense
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submit}
                                disabled={saving || totalQty === 0}
                                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <CheckCircle2 size={15} />
                                {saving ? 'Dispensing' : 'Confirm dispense'}
                            </button>
                        </div>
                    </div>
                </footer>
            </aside>
        </>
    );
}

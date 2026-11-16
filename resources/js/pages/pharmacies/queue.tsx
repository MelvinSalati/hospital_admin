// pages/pharmacies/queue.tsx
import { router, usePage, Link } from '@inertiajs/react';
import { CheckCircle2, Pill, X } from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
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

interface RxRow {
    id: number;
    token: string | null;
    rx_number: string;
    patient_name: string;
    patient_id: number;
    created_at: string | null;
    status: string;
    item_count: number;
    pending_count: number;
    items: RxItem[];
}

interface AuthUser {
    id: number;
    name: string;
    email?: string;
}

interface Props {
    prescriptions: RxRow[];
    auth: { user: AuthUser };
}

const formatDate = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '—';

// ============ PAGE ============
export default function Queue() {
    const { props } = usePage<Props>();
    const rows = props.prescriptions ?? [];
    const userId = props.auth.user.id;
    console.log(props);
    const [active, setActive] = useState<RxRow | null>(null);

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Pharmacy' },
                { href: '', title: 'Queue' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <PageHeader
                    icon={<Pill className="h-5 w-5" />}
                    title="Pharmacy Queue"
                    subtitle="Prescriptions awaiting dispensation"
                />

                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Rx #</th>
                                <th className="px-4 py-3">Patient</th>
                                <th className="px-4 py-3">Token</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((rx) => (
                                <tr
                                    key={rx.id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                                >
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                                        {rx.rx_number}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {rx.patient_name}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                        {rx.token ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">
                                        {formatDate(rx.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        <span className="font-semibold text-amber-700">
                                            {rx.pending_count}
                                        </span>{' '}
                                        / {rx.item_count} pending
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 capitalize">
                                            {rx.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                       {rx.patient_id ? (
        <Link
            href={`/patients/pharmacy/dispense/${rx.patient_id}`}
            className="text-blue-600 hover:underline"
        >
            Dispense
        </Link>
    ) : (
        <span className="text-gray-400">No patient</span>
    )}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-10 text-center text-sm text-slate-500"
                                    >
                                        No prescriptions awaiting dispensation.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DispenseDrawer
                rx={active}
                onClose={() => setActive(null)}
                userId={userId}
                departmentId={props.auth.user.profile.department_id}
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
                            {rx.patient_name}
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
